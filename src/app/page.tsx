// src/app/page.tsx
"use client";

import Link from 'next/link'; // Ensures Link is imported
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LocationInput } from '@/components/LocationInput';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import type { WeatherData, AIWeatherScene, ForecastDayData } from '@/types/weather';
import type { SavedSearch } from '@/types/savedSearch';
import { getRealtimeWeatherData } from '@/app/actions/weatherActions';
import { generateWeatherScene, type GenerateWeatherSceneInput } from '@/ai/flows/generate-weather-scene';
import { AuthDisplay } from '@/components/AuthDisplay';
import { useAuth } from '@/hooks/useAuth';
import { SavedSearchItem } from '@/components/SavedSearchItem';
import { Github, Linkedin, Loader2, ShieldAlert, Save, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DEFAULT_LOCATION = "Paris";

export default function WeatherPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [location, setLocation] = useState<string>(DEFAULT_LOCATION);
  const [currentCoords, setCurrentCoords] = useState<{lat: number; lon: number} | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [aiScene, setAiScene] = useState<AIWeatherScene | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For weather fetching
  const [isSaving, setIsSaving] = useState<boolean>(false); // For saving search
  const [error, setError] = useState<string | null>(null);
  const [selectedForecastDay, setSelectedForecastDay] = useState<ForecastDayData | null>(null);
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [showSavedSearches, setShowSavedSearches] = useState<boolean>(false);


  const fetchWeatherAndScene = useCallback(async (loc: string, coords?: {lat: number, lon: number}) => {
    setIsLoading(true);
    setError(null);
    // setWeatherData(null); // Keep old data while loading new for better UX
    setSelectedForecastDay(null); 
    setCurrentCoords(coords || null);

    try {
      const weatherPromise = getRealtimeWeatherData(loc);
      const scenePromise = !loc.startsWith('coords:') 
        ? generateWeatherScene({ location: loc } as GenerateWeatherSceneInput)
        : Promise.resolve({ imageUri: null, reliability: 'AI scene generation skipped for coordinate-based search.' });

      const [weather, sceneDataResult] = await Promise.allSettled([weatherPromise, scenePromise]);

      if (weather.status === 'fulfilled') {
        setWeatherData(weather.value);
        if (!coords && weather.value.current.locationName.includes("Lat:")) { // If geocoding of typed location returned coords
            // Try to extract lat/lon from locationName for saving, this is a bit hacky
            // Ideally, weatherActions would return lat/lon used for the successful fetch
        }
      } else {
        console.error("Weather fetch error:", weather.reason);
        let errorMessage = "Failed to fetch weather data.";
        if (weather.reason instanceof Error && weather.reason.message) {
          errorMessage = weather.reason.message;
        }
        setError(errorMessage);
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
      
      if (sceneDataResult.status === 'fulfilled' && sceneDataResult.value.imageUri) {
         setAiScene({ imageUri: sceneDataResult.value.imageUri, reliability: sceneDataResult.value.reliability });
      } else {
        setAiScene({ imageUri: null, reliability: sceneDataResult.status === 'fulfilled' ? sceneDataResult.value.reliability : 'AI scene generation failed or skipped.' });
        if (sceneDataResult.status === 'rejected') console.warn("AI Scene generation warning:", sceneDataResult.reason);
      }

    } catch (err) {
      console.error("General fetch error in fetchWeatherAndScene:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to load data: ${errorMessage}`);
      toast({ title: "Error", description: `Failed to load data: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchSavedSearches = useCallback(async () => {
    if (!user) return;
    setIsLoadingSaved(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/saved-searches', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch saved searches');
      }
      const data: SavedSearch[] = await response.json();
      setSavedSearches(data);
    } catch (err) {
      console.error("Failed to fetch saved searches:", err);
      toast({ title: "Error", description: (err as Error).message || "Could not load saved searches.", variant: "destructive" });
    } finally {
      setIsLoadingSaved(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchWeatherAndScene(DEFAULT_LOCATION);
  }, [fetchWeatherAndScene]);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    } else {
      setSavedSearches([]); // Clear saved searches if user logs out
      setShowSavedSearches(false);
    }
  }, [user, fetchSavedSearches]);

  const handleSearch = (searchLocation: string) => {
    setLocation(searchLocation); 
    fetchWeatherAndScene(searchLocation);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      toast({ title: "Geolocation Error", description: "Geolocation is not supported.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
        const locationString = `coords:${coords.lat},${coords.lon}`;
        setLocation(locationString); // Set location to the coord string for retry logic
        fetchWeatherAndScene(locationString, coords); 
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
        toast({ title: "Geolocation Error", description: err.message, variant: "destructive" });
        setIsLoading(false);
      }
    );
  };

  const handleSaveSearch = async () => {
    if (!user || !weatherData) {
      toast({ title: "Cannot Save", description: "You must be logged in and have weather data to save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      // Determine lat/lon for saving
      let latToSave: number | undefined;
      let lonToSave: number | undefined;

      if (currentCoords) { // From geolocation
        latToSave = currentCoords.lat;
        lonToSave = currentCoords.lon;
      } else if (weatherData.current.locationName && !weatherData.current.locationName.startsWith("Lat:")) {
        // Attempt to get lat/lon from weatherData if available and not already a coord string
        // This part is tricky as OWM responses might not always return precise input lat/lon.
        // For now, if not geolocated, we might not have precise lat/lon to save.
        // A better approach would be for weatherActions to consistently return the lat/lon it used.
        // Let's assume weatherData.current might have it or we skip if not perfectly clear.
        // For simplicity in this iteration, we'll use the geocoding result's lat/lon IF weatherActions.ts is updated to return it.
        // Since it's not currently structured that way, we'll prioritize currentCoords.
      }
      
      // If after checks, lat/lon are still undefined, we might not be able to save accurately.
      // However, the API /api/saved-searches expects latitude and longitude.
      // For now, this means saving might be problematic for typed searches if we don't get explicit lat/lon back.
      // We need `weatherActions` to return the used lat/lon.
      // Given current structure of `weatherActions`, it doesn't explicitly return the lat/lon it resolved to.
      // This is a limitation to address. For now, we will attempt to save based on what we have.
      // Fallback: if weatherData.current.locationName is a coordinate string already, parse from there
      if (latToSave === undefined && weatherData.current.locationName.startsWith("coords:")) {
          const parts = weatherData.current.locationName.substring(7).split(',');
          if (parts.length === 2) {
              latToSave = parseFloat(parts[0]);
              lonToSave = parseFloat(parts[1]);
          }
      } else if (latToSave === undefined && weatherData.current.locationName.startsWith("Lat:")) {
          const parts = weatherData.current.locationName.replace("Lat: ", "").replace("Lon: ", "").split(',');
           if (parts.length === 2) {
              latToSave = parseFloat(parts[0]);
              lonToSave = parseFloat(parts[1]);
          }
      }
      
      // Final check
      if (latToSave === undefined || lonToSave === undefined) {
          toast({ title: "Cannot Save", description: "Could not determine precise coordinates for this location to save.", variant: "destructive" });
          setIsSaving(false);
          return;
      }


      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
            weatherData, 
            locationName: weatherData.current.locationName, // Use locationName from current weather data
            latitude: latToSave, 
            longitude: lonToSave 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save search');
      }
      toast({ title: "Search Saved!", description: `${weatherData.current.locationName} has been saved.` });
      fetchSavedSearches(); // Refresh saved searches list
    } catch (err) {
      console.error("Failed to save search:", err);
      toast({ title: "Error Saving", description: (err as Error).message || "Could not save the search.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleViewSavedSearch = (savedSearch: SavedSearch) => {
    setLocation(savedSearch.locationName); // Or construct coords string if preferred: `coords:${savedSearch.latitude},${savedSearch.longitude}`
    setWeatherData(savedSearch.weatherSnapshot);
    // Optionally, could also try to regenerate AI scene for the loaded location
    // generateWeatherScene({ location: savedSearch.locationName }... setAiScene(...)
    // For now, just load the weather data.
    setShowSavedSearches(false); // Hide the list after loading one
    toast({ title: "Loaded Saved Search", description: `Displaying weather for ${savedSearch.locationName}.`});
  };


  const handleForecastDaySelect = (day: ForecastDayData | null) => {
    setSelectedForecastDay(day === selectedForecastDay ? null : day);
  };

  const currentBackgroundStyle = { 
    backgroundImage: aiScene?.imageUri ? `url(${aiScene.imageUri})` : 'linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--background)))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed' 
  };

  return (
    <div className="min-h-screen flex flex-col transition-all duration-1000 ease-in-out" style={currentBackgroundStyle}>
      <header className="p-4 bg-background/70 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold text-primary">WeatherEyes</Link>
          <AuthDisplay />
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
        <LocationInput onSearch={handleSearch} onGeolocate={handleGeolocate} isLoading={isLoading || isSaving || authLoading} />

        {user && !authLoading && (
            <div className="flex gap-2 mb-6">
                <Button onClick={handleSaveSearch} disabled={isSaving || isLoading || !weatherData} className="min-w-[150px]">
                    {isSaving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Search</>}
                </Button>
                <Button variant="outline" onClick={() => setShowSavedSearches(prev => !prev)} disabled={isLoadingSaved} className="min-w-[180px]">
                    {isLoadingSaved ? <Loader2 className="animate-spin" /> : <><ListChecks className="mr-2 h-4 w-4" /> {showSavedSearches ? "Hide" : "My Saved Searches"}</>}
                </Button>
            </div>
        )}

        {showSavedSearches && user && (
          <Card className="w-full max-w-2xl mb-8 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">My Saved Searches</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSaved && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {!isLoadingSaved && savedSearches.length === 0 && <p className="text-center text-muted-foreground">No saved searches yet.</p>}
              {!isLoadingSaved && savedSearches.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                  {savedSearches.map(s => (
                    <SavedSearchItem key={s._id?.toString()} search={s} onView={handleViewSavedSearch} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {(isLoading || authLoading) && !weatherData && (
          <div className="flex flex-col items-center justify-center text-center p-10 rounded-lg bg-card/80 backdrop-blur-sm shadow-xl">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold">{(authLoading && !user) ? "Authenticating..." : "Fetching weather data..."}</p>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center p-10 rounded-lg bg-destructive/20 backdrop-blur-sm shadow-xl border border-destructive">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-xl font-semibold text-destructive-foreground">Oops! Something went wrong.</p>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchWeatherAndScene(location || DEFAULT_LOCATION, currentCoords)} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !authLoading && weatherData && (
          <WeatherDisplay 
            weatherData={weatherData} 
            aiScene={aiScene}
            selectedForecastDay={selectedForecastDay}
            onForecastDaySelect={handleForecastDaySelect}
          />
        )}
        
        {!isLoading && !authLoading && !weatherData && !error && (
            <div className="text-center p-10 rounded-lg bg-card/80 backdrop-blur-sm shadow-xl">
                <p className="text-xl">Welcome to WeatherEyes!</p>
                <p className="text-muted-foreground">Enter a location to get started or use your current location.</p>
                {!user && <p className="mt-2 text-sm">Login or Sign up to save your searches!</p>}
            </div>
        )}
      </main>

      <footer className="p-4 bg-background/70 backdrop-blur-md shadow-inner text-center">
        <p className="text-sm text-muted-foreground">
          Developed by khwajamainuddin.
        </p>
        <div className="flex justify-center space-x-4 mt-2">
            <a href="https://github.com/FirebaseExtended/studio-examples" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
                <Github className="h-5 w-5 hover:text-primary transition-colors" />
            </a>
            <a href="https://www.linkedin.com/company/product-manager-accelerator/" target="_blank" rel="noopener noreferrer" aria-label="Product Manager Accelerator LinkedIn">
                <Linkedin className="h-5 w-5 hover:text-primary transition-colors" />
            </a>
        </div>
      </footer>
    </div>
  );
}
