// src/components/WeatherDisplay.tsx
"use client";

import type { WeatherData, AIWeatherScene } from '@/types/weather';
import { CurrentWeather } from './CurrentWeather';
import { ForecastItem } from './ForecastItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarDays } from 'lucide-react';

interface WeatherDisplayProps {
  weatherData: WeatherData;
  aiScene: AIWeatherScene | null;
}

export function WeatherDisplay({ weatherData, aiScene }: WeatherDisplayProps) {
  return (
    <div className="space-y-8">
      <CurrentWeather data={weatherData.current} aiReliability={aiScene?.reliability} />
      
      <Card className="w-full max-w-3xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center">
            <CalendarDays className="mr-2 text-primary" /> 7-Day Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {weatherData.forecast.map((day, index) => (
                <ForecastItem key={index} data={day} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

