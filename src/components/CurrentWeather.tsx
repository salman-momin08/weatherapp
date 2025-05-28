
// src/components/CurrentWeather.tsx
"use client";

import type { CurrentWeatherData } from '@/types/weather';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getWeatherIcon, formatTimestamp } from '@/lib/weather-utils';
import { Thermometer, Droplets, WindIcon, Eye, Info, MapPin } from 'lucide-react'; // Added MapPin
import { Badge } from '@/components/ui/badge';

interface CurrentWeatherProps {
  data: CurrentWeatherData;
  aiReliability?: string | null;
  timeZone?: string; // Added timezone for accurate timestamp formatting
}

export function CurrentWeather({ data, aiReliability, timeZone }: CurrentWeatherProps) {
  return (
    <Card className="w-full max-w-md mx-auto mb-8 shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center text-center mb-1">
          <MapPin className="h-7 w-7 mr-2 text-primary" />
          <CardTitle className="text-3xl font-bold">{data.locationName}</CardTitle>
        </div>
        <CardDescription className="text-center text-sm">
          Last updated: {formatTimestamp(data.timestamp, timeZone)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="my-4">
          {getWeatherIcon(data.icon, { size: 80, className: "text-accent" })}
        </div>
        <p className="text-6xl font-bold mb-2">{data.temperature}°C</p>
        <p className="text-xl capitalize text-muted-foreground mb-6">{data.description}</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-sm mb-6">
          <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-md">
            <Eye className="text-primary" />
            <span>Feels like: {data.feelsLike}°C</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-md">
            <Droplets className="text-primary" />
            <span>Humidity: {data.humidity}%</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-md col-span-1 sm:col-span-2">
            <WindIcon className="text-primary" />
            <span>Wind: {data.windSpeed} km/h</span>
          </div>
        </div>

        {aiReliability && (
          <Badge variant="outline" className="mt-4 p-2 text-xs text-center w-full bg-secondary/50 border-secondary">
            <Info size={14} className="mr-1 inline-block" />
            <span className="font-semibold mr-1">Background Info:</span>{aiReliability}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}


    