
// src/app/page.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LocationInput } from '@/components/LocationInput';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import type { WeatherDataCore, ForecastDayData, AIWeatherScene } from '@/types/weather'; // Updated to WeatherDataCore
import type { SavedSearch } from '@/types/savedSearch';
import { getRealtimeWeatherData } from '@/app/actions/weatherActions';
import { SavedSearchItem } from '@/components/SavedSearchItem';
import { EditSavedSearchDialog } from '@/components/EditSavedSearchDialog';
import { AuthDisplay } from '@/components/AuthDisplay';
import { useAuth } from '@/hooks/useAuth';
import { Github, Linkedin, Loader2, ShieldAlert, Save, ListChecks, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DEFAULT_LOCATION = "Bangalore";

export default function WeatherPage() {
  const { toast } = useToast();
  const { user, token, isLoading: authIsLoading } = useAuth();

  const [location, setLocation] = useState<string>(DEFAULT_LOCATION);
  const [currentCoords, setCurrentCoords] = useState<{lat: number; lon: number} | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherDataCore | null>(null); // Updated to WeatherDataCore
  const [aiSceneImage, setAiSceneImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedForecastDay, setSelectedForecastDay] = useState<ForecastDayData | null>(null);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [isDeletingSearchId, setIsDeletingSearchId] = useState<string | null>(null);
  const [showSavedSearches, setShowSavedSearches] = useState<boolean>(false);

  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isUpdatingSearch, setIsUpdatingSearch] = useState<boolean>(false);


  const fetchWeatherAndScene = useCallback(async (loc: string, coords?: {lat: number, lon: number}) => {
    setIsLoading(true);
    setError(null);
    setSelectedForecastDay(null);
    setCurrentCoords(coords || null);
    setAiSceneImage(null); // Clear previous AI scene

    try {
      const result = await getRealtimeWeatherData(loc);
      if (result.success) {
        setWeatherData(result.data);
        if (result.data.aiScene?.imageUri) {
          setAiSceneImage(result.data.aiScene.imageUri);
        } else {
          setAiSceneImage(null);
        }
        setError(null); // Clear previous error on success
      } else {
        // Handle errors returned by the action (e.g., "Location not found")
        setError(result.error);
        setWeatherData(null);
        setAiSceneImage(null);
        toast({ title: "Error Fetching Weather", description: result.error, variant: "destructive" });
      }
    } catch (err) { // Catch unexpected errors if the action itself crashes
      console.error("Unexpected error in fetchWeatherAndScene:", err); // Log truly unexpected errors
      let errorMessage = "An unexpected error occurred while fetching weather data.";
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setWeatherData(null);
      setAiSceneImage(null);
      toast({ title: "Error Fetching Weather", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchSavedSearches = useCallback(async () => {
    if (!token || !user) {
      setSavedSearches([]);
      return;
    }
    setIsLoadingSaved(true);
    try {
      const response = await fetch('/api/saved-searches', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const responseText = await response.text();
      let descriptiveError = `Failed to fetch saved searches. Status: ${response.status}.`;

      if (!response.ok) {
        try {
            const errorData = JSON.parse(responseText);
            descriptiveError += ` Server message: ${errorData.error || errorData.message || 'Unknown API error'}`;
        } catch (jsonParseError) {
            descriptiveError += " The server returned an unexpected (non-JSON) response. This might indicate a server-side issue or misconfiguration. Check server logs.";
            console.error("Received HTML or non-JSON error from /api/saved-searches GET:", responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""));
        }
        throw new Error(descriptiveError);
      }
      const data: SavedSearch[] = JSON.parse(responseText);
      setSavedSearches(data);
    } catch (err) {
      console.error("Failed to fetch saved searches:", err);
      toast({ title: "Error Loading Saved Searches", description: (err as Error).message || "Could not load saved searches.", variant: "destructive" });
    } finally {
      setIsLoadingSaved(false);
    }
  }, [toast, token, user]);


  useEffect(() => {
    fetchWeatherAndScene(DEFAULT_LOCATION);
  }, [fetchWeatherAndScene]);

  useEffect(() => {
    if (user && token) {
      fetchSavedSearches();
    } else {
      setSavedSearches([]);
    }
  }, [user, token, fetchSavedSearches]);


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
    setIsLoading(true); // Should be managed by fetchWeatherAndScene, but good for immediate feedback
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
        const locationString = `coords:${coords.lat},${coords.lon}`;
        setLocation(locationString); 
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
    if (!weatherData) {
      toast({ title: "Cannot Save", description: "No weather data to save.", variant: "destructive" });
      return;
    }
    if (!user || !token) {
      toast({ title: "Login Required", description: "Please log in to save searches.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      let latToSave: number | undefined = weatherData.resolvedLat;
      let lonToSave: number | undefined = weatherData.resolvedLon;

      if (latToSave === undefined || lonToSave === undefined) {
        if (currentCoords) {
          latToSave = currentCoords.lat;
          lonToSave = currentCoords.lon;
        } else if (location.startsWith('coords:')) {
            const parts = location.substring(7).split(',');
            if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                latToSave = parseFloat(parts[0]);
                lonToSave = parseFloat(parts[1]);
            }
        }
      }
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
            weatherData, // This is WeatherDataCore
            locationName: weatherData.current.locationName,
            latitude: latToSave,
            longitude: lonToSave
        }),
      });

      const responseText = await response.text();
      let descriptiveError = `Failed to save search. Status: ${response.status}.`;
      if (!response.ok) {
        try {
            const errorData = JSON.parse(responseText);
            descriptiveError += ` Server message: ${errorData.error || errorData.details || errorData.message || 'Unknown API error'}`;
        } catch (jsonError) {
            descriptiveError += " The server returned an unexpected (non-JSON) response.";
            console.error("Received HTML or non-JSON error from /api/saved-searches POST:", responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""));
        }
        throw new Error(descriptiveError);
      }
      const newSavedSearch: SavedSearch = JSON.parse(responseText);
      toast({ title: "Search Saved!", description: `${newSavedSearch.locationName} has been saved.` });
      fetchSavedSearches();
    } catch (err) {
      console.error("Failed to save search:", err);
      toast({ title: "Error Saving", description: (err as Error).message || "Could not save the search.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewSavedSearch = (savedSearch: SavedSearch) => {
    setLocation(savedSearch.locationName);
    setWeatherData(savedSearch.weatherSnapshot); // weatherSnapshot is WeatherDataCore
    setCurrentCoords({lat: savedSearch.latitude, lon: savedSearch.longitude});
    if (savedSearch.weatherSnapshot.aiScene?.imageUri) {
        setAiSceneImage(savedSearch.weatherSnapshot.aiScene.imageUri);
    } else {
        setAiSceneImage(null);
    }
    setShowSavedSearches(false);
    setSelectedForecastDay(null);
    toast({ title: "Loaded Saved Search", description: `Displaying weather for ${savedSearch.locationName}.`});
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (!token || !user) {
      toast({ title: "Login Required", description: "Please log in to delete searches.", variant: "destructive" });
      return;
    }
    setIsDeletingSearchId(searchId);
    try {
      const response = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const responseText = await response.text();
      if (!response.ok) {
        let descriptiveError = `Failed to delete search. Status: ${response.status}.`;
         try {
            const errorData = JSON.parse(responseText);
            descriptiveError += ` Server message: ${errorData.error || errorData.message || 'Unknown API error'}`;
        } catch (jsonError) {
            descriptiveError += " The server returned an unexpected (non-JSON) response.";
            console.error("Received HTML or non-JSON error from /api/saved-searches DELETE:", responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""));
        }
        throw new Error(descriptiveError);
      }
      toast({ title: "Search Deleted", description: "The saved search has been removed." });
      setSavedSearches(prevSearches => prevSearches.filter(s => s._id?.toString() !== searchId));
    } catch (err) {
      console.error("Failed to delete search:", err);
      toast({ title: "Error Deleting", description: (err as Error).message || "Could not delete the search.", variant: "destructive" });
    } finally {
      setIsDeletingSearchId(null);
    }
  };

  const handleEditSearch = (search: SavedSearch) => {
    setEditingSearch(search);
    setIsEditModalOpen(true);
  };

  const handleUpdateSearch = async (searchId: string, newLocationName: string): Promise<boolean> => {
    if (!token || !user) {
      toast({ title: "Login Required", description: "Please log in to update searches.", variant: "destructive" });
      return false;
    }
    setIsUpdatingSearch(true);
    try {
      const response = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ locationName: newLocationName }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        let descriptiveError = `Failed to update search. Status: ${response.status}.`;
        try {
          const errorData = JSON.parse(responseText);
          descriptiveError += ` Server message: ${errorData.error || errorData.message || 'Unknown API error'}`;
        } catch (jsonError) {
          descriptiveError += " The server returned an unexpected (non-JSON) response.";
           console.error("Received HTML or non-JSON error from /api/saved-searches PUT:", responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""));
        }
        throw new Error(descriptiveError);
      }
      const updatedSearch: SavedSearch = JSON.parse(responseText);
      toast({ title: "Search Updated", description: `${updatedSearch.locationName} has been updated.` });
      setSavedSearches(prevSearches =>
        prevSearches.map(s => s._id?.toString() === searchId ? updatedSearch : s)
      );
      if (weatherData && weatherData.current.locationName === editingSearch?.locationName) {
        setWeatherData(updatedSearch.weatherSnapshot);
        if (updatedSearch.weatherSnapshot.aiScene?.imageUri) {
            setAiSceneImage(updatedSearch.weatherSnapshot.aiScene.imageUri);
        } else {
            setAiSceneImage(null);
        }
      }
      return true;
    } catch (err) {
      console.error("Failed to update search:", err);
      toast({ title: "Error Updating", description: (err as Error).message || "Could not update the search.", variant: "destructive" });
      return false;
    } finally {
      setIsUpdatingSearch(false);
    }
  };


  const handleForecastDaySelect = (day: ForecastDayData | null) => {
    setSelectedForecastDay(day === selectedForecastDay ? null : day);
  };

  const anyLoadingState = isLoading || isSaving || authIsLoading || !!isDeletingSearchId || isUpdatingSearch || isLoadingSaved;
  
  const fallbackGradient = 'bg-gradient-to-br from-primary/70 to-background/60';


  return (
    <div
      className="flex flex-col min-h-screen w-full text-card-foreground overflow-y-auto transition-all duration-1000 ease-in-out"
      style={{
        backgroundImage: aiSceneImage ? `url(${aiSceneImage})` : fallbackGradient,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <header className="p-4 bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold text-primary">WeatherEyes</Link>
          <AuthDisplay />
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
        <LocationInput onSearch={handleSearch} onGeolocate={handleGeolocate} isLoading={anyLoadingState} />

        {user && !authIsLoading && (
          <div className="flex gap-2 mb-6">
              <Button onClick={handleSaveSearch} disabled={anyLoadingState || !weatherData} className="min-w-[150px] bg-card text-card-foreground hover:bg-card/90 border border-border">
                  {isSaving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Search</>}
              </Button>
              <Button variant="outline" onClick={() => setShowSavedSearches(prev => !prev)} disabled={anyLoadingState} className="min-w-[180px] bg-card text-card-foreground hover:bg-card/90 border border-border">
                  {isLoadingSaved && showSavedSearches ? <Loader2 className="animate-spin" /> : <><ListChecks className="mr-2 h-4 w-4" /> {showSavedSearches ? "Hide" : "My Saved Searches"}</>}
              </Button>
          </div>
        )}

        {user && showSavedSearches && (
          <Card className="w-full max-w-2xl mb-8 bg-card text-card-foreground shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">My Saved Searches</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSaved && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {!isLoadingSaved && savedSearches.length === 0 && <p className="text-center text-muted-foreground">No saved searches yet.</p>}
              {!isLoadingSaved && savedSearches.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                  {savedSearches.map(s => (
                    <SavedSearchItem
                        key={s._id?.toString()}
                        search={s}
                        onView={handleViewSavedSearch}
                        onDelete={handleDeleteSearch}
                        onEdit={handleEditSearch}
                        isDeleting={isDeletingSearchId === s._id?.toString()}
                        isEditing={isUpdatingSearch || (editingSearch?._id === s._id?.toString() && isEditModalOpen)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(isLoading || authIsLoading) && !weatherData && (
          <div className="flex flex-col items-center justify-center text-center p-10 rounded-lg bg-card/80 backdrop-blur-sm shadow-xl text-card-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold">{authIsLoading ? "Authenticating..." : "Fetching weather data..."}</p>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </div>
        )}

        {error && !isLoading && !authIsLoading && (
          <div className="text-center p-10 rounded-lg bg-destructive/20 backdrop-blur-sm shadow-xl border border-destructive">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-xl font-semibold text-destructive-foreground">Oops! Something went wrong.</p>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchWeatherAndScene(location || DEFAULT_LOCATION, currentCoords)} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !authIsLoading && weatherData && (
          <WeatherDisplay
            weatherData={weatherData}
            selectedForecastDay={selectedForecastDay}
            onForecastDaySelect={handleForecastDaySelect}
          />
        )}

        {!isLoading && !authIsLoading && !weatherData && !error && (
            <div className="text-center p-10 rounded-lg bg-card/80 backdrop-blur-sm shadow-xl text-card-foreground">
                <p className="text-xl">Welcome to WeatherEyes!</p>
                <p className="text-muted-foreground">Enter a location to get started or use your current location.</p>
                {!user && <p className="text-muted-foreground mt-2">Consider <Link href="/login" className="underline text-primary hover:text-accent">logging in</Link> or <Link href="/signup" className="underline text-primary hover:text-accent">signing up</Link> to save your searches!</p>}
            </div>
        )}
      </main>

      <EditSavedSearchDialog
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        search={editingSearch}
        onUpdate={handleUpdateSearch}
        isLoading={isUpdatingSearch}
      />

      <footer className="p-4 bg-card/70 backdrop-blur-md shadow-inner text-center">
        <p className="text-sm text-muted-foreground">
          Developed by khwajamainuddin.
        </p>
        <div className="flex justify-center space-x-4 mt-2">
            <a href="https://github.com/FirebaseExtended/studio-examples/tree/main/weather-eyes-genkit" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" className="group">
                <Github className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a href="https://www.linkedin.com/company/product-manager-accelerator/" target="_blank" rel="noopener noreferrer" aria-label="Product Manager Accelerator LinkedIn" className="group">
                <Linkedin className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
        </div>
      </footer>
    </div>
  );
}

