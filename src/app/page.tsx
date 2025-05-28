// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LocationInput } from '@/components/LocationInput';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import type { WeatherData, AIWeatherScene, ForecastDayData } from '@/types/weather';
// import { getMockWeatherData } from '@/lib/weather-utils'; // Replaced with server action
import { getRealtimeWeatherData } from '@/app/actions/weatherActions'; // Import server action
import { generateWeatherScene, type GenerateWeatherSceneInput } from '@/ai/flows/generate-weather-scene';
import { Info, Github, Linkedin, Loader2, ShieldAlert } from 'lucide-react';

const DEFAULT_LOCATION = "Paris"; // Default location on initial load

export default function WeatherPage() {
  const [location, setLocation] = useState<string>(DEFAULT_LOCATION);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [aiScene, setAiScene] = useState<AIWeatherScene | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForecastDay, setSelectedForecastDay] = useState<ForecastDayData | null>(null);
  const { toast } = useToast();

  const fetchWeatherAndScene = useCallback(async (loc: string) => {
    setIsLoading(true);
    setError(null);
    setWeatherData(null); 
    setSelectedForecastDay(null); 

    try {
      // Use the new server action for weather data
      const weatherPromise = getRealtimeWeatherData(loc);
      // Only generate scene if it's not a coordinate-based search,
      // as AI scene generation is better with named locations.
      const scenePromise = !loc.startsWith('coords:') 
        ? generateWeatherScene({ location: loc } as GenerateWeatherSceneInput)
        : Promise.resolve({ imageUri: null, reliability: 'AI scene generation skipped for coordinate-based search.' });


      const [weather, sceneDataResult] = await Promise.allSettled([weatherPromise, scenePromise]);

      if (weather.status === 'fulfilled') {
        setWeatherData(weather.value);
      } else {
        console.error("Weather fetch error:", weather.reason);
        // Check if the reason is an Error and has a message
        let errorMessage = "Failed to fetch weather data.";
        if (weather.reason instanceof Error && weather.reason.message) {
            // Check for specific user-friendly messages from the action
            if (weather.reason.message.startsWith("Could not fetch weather: Location not found") ||
                weather.reason.message.startsWith("Could not fetch weather: Failed to geocode location: Invalid API key") ||
                weather.reason.message.includes("requires a separate subscription")) {
                errorMessage = weather.reason.message.replace("Could not fetch weather: ", ""); // Make it more direct
            } else {
                errorMessage = weather.reason.message;
            }
        }
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      if (sceneDataResult.status === 'fulfilled' && sceneDataResult.value.imageUri) {
         setAiScene({ imageUri: sceneDataResult.value.imageUri, reliability: sceneDataResult.value.reliability });
      } else if (sceneDataResult.status === 'fulfilled' && !sceneDataResult.value.imageUri) {
        // AI scene explicitly skipped or failed to generate an image, but didn't error
        setAiScene({ imageUri: null, reliability: sceneDataResult.value.reliability });
        console.warn("AI Scene generation: No image URI returned or generation skipped. Reliability: ", sceneDataResult.value.reliability);
      } else if (sceneDataResult.status === 'rejected') {
        console.warn("AI Scene generation warning:", sceneDataResult.reason);
        setAiScene({ imageUri: null, reliability: 'AI scene generation failed.' });
      }

    } catch (err) { // This catch block might be less used if individual promises are handled with allSettled
      console.error("General fetch error in fetchWeatherAndScene:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to load data: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to load data: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Fetch for default location on initial load
    fetchWeatherAndScene(DEFAULT_LOCATION);
  }, [fetchWeatherAndScene]);


  const handleSearch = (searchLocation: string) => {
    setLocation(searchLocation); 
    fetchWeatherAndScene(searchLocation);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      toast({ title: "Geolocation Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationString = `coords:${position.coords.latitude},${position.coords.longitude}`;
        fetchWeatherAndScene(locationString); 
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
        toast({ title: "Geolocation Error", description: err.message, variant: "destructive" });
        setIsLoading(false);
      }
    );
  };

  const handleForecastDaySelect = (day: ForecastDayData | null) => {
    if (selectedForecastDay?.date === day?.date) {
      setSelectedForecastDay(null); 
    } else {
      setSelectedForecastDay(day);
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-all duration-1000 ease-in-out" 
         style={{ 
           backgroundImage: aiScene?.imageUri ? `url(${aiScene.imageUri})` : 'linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--background)))',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed' 
         }}>
      <header className="p-4 bg-background/70 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">WeatherEyes</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            asChild
            aria-label="Product Manager Accelerator LinkedIn Page"
          >
            <a href="https://www.linkedin.com/company/product-manager-accelerator/" className="group" target="_blank" rel="noopener noreferrer">
              <Info className="h-6 w-6 text-accent group-hover:text-accent-foreground" />
            </a>
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <LocationInput onSearch={handleSearch} onGeolocate={handleGeolocate} isLoading={isLoading} />

        {isLoading && !weatherData && (
          <div className="flex flex-col items-center justify-center text-center p-10 rounded-lg bg-card/80 backdrop-blur-sm shadow-xl">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold">Fetching weather data...</p>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center p-10 rounded-lg bg-destructive/20 backdrop-blur-sm shadow-xl border border-destructive">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-xl font-semibold text-destructive-foreground">Oops! Something went wrong.</p>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchWeatherAndScene(location || DEFAULT_LOCATION)} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && weatherData && (
          <WeatherDisplay 
            weatherData={weatherData} 
            aiScene={aiScene}
            selectedForecastDay={selectedForecastDay}
            onForecastDaySelect={handleForecastDaySelect}
          />
        )}
        
        {!isLoading && !weatherData && !error && (
            <div className="text-center p-10 rounded-lg bg-card/80 backdrop-blur-sm shadow-xl">
                <p className="text-xl">Welcome to WeatherEyes!</p>
                <p className="text-muted-foreground">Enter a location to get started or use your current location.</p>
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
