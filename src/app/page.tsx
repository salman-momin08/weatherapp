// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LocationInput } from '@/components/LocationInput';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import type { WeatherData, AIWeatherScene, ForecastDayData } from '@/types/weather';
import { getMockWeatherData } from '@/lib/weather-utils';
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
    setSelectedForecastDay(null); // Reset selected day on new location search

    try {
      const weatherPromise = getMockWeatherData(loc);
      const scenePromise = generateWeatherScene({ location: loc } as GenerateWeatherSceneInput);

      const [weather, sceneData] = await Promise.allSettled([weatherPromise, scenePromise]);

      if (weather.status === 'fulfilled') {
        setWeatherData(weather.value);
        // By default, select "Today's" forecast data if available (which is the first item)
        if (weather.value && weather.value.forecast && weather.value.forecast.length > 0) {
          // No, we want current day's AQI/Hourly by default, not necessarily selecting the first forecast card.
          // setSelectedForecastDay(weather.value.forecast[0]); 
        }
      } else {
        console.error("Weather fetch error:", weather.reason);
        setError("Could not fetch weather data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to fetch weather data.",
          variant: "destructive",
        });
      }
      
      if (sceneData.status === 'fulfilled' && sceneData.value.imageUri) {
         setAiScene({ imageUri: sceneData.value.imageUri, reliability: sceneData.value.reliability });
      } else {
        console.error("AI Scene generation error:", sceneData.status === 'rejected' ? sceneData.reason : "No image URI");
        toast({
          title: "AI Background",
          description: "Could not generate a new weather scene. Previous background may remain or default will be used.",
          variant: "default",
        });
      }

    } catch (err) {
      console.error("General fetch error:", err);
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
        const cityFromCoords = "Current Location (Simulated)"; 
        const locationString = `coords:${position.coords.latitude},${position.coords.longitude}`;
        setLocation(cityFromCoords); 
        fetchWeatherAndScene(cityFromCoords); 
        console.log(locationString); 
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
      setSelectedForecastDay(null); // Deselect if clicking the same day again
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
            <a href="https://www.linkedin.com/company/product-manager-accelerator/" target="_blank" rel="noopener noreferrer">
              <Info className="h-6 w-6 text-accent" />
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
