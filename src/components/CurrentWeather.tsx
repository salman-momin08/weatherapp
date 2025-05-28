
// src/components/CurrentWeather.tsx
"use client";

import type { CurrentWeatherData, AIWeatherScene } from '@/types/weather';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getWeatherIcon, formatTimestamp } from '@/lib/weather-utils';
import { Thermometer, Droplets, WindIcon, Eye, MapPin, Info } from 'lucide-react';

interface CurrentWeatherProps {
  data: CurrentWeatherData;
  timeZone?: string;
  aiScene?: AIWeatherScene | null;
}

export function CurrentWeather({ data, timeZone, aiScene }: CurrentWeatherProps) {
  return (
    <Card className="w-full max-w-md mx-auto mb-8 shadow-xl bg-card text-card-foreground"> {/* White card */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center text-center mb-1">
          <MapPin className="h-7 w-7 mr-2 text-card-foreground" />
          <CardTitle className="text-3xl font-bold">{data.locationName}</CardTitle>
        </div>
        <CardDescription className="text-center text-sm text-muted-foreground"> {/* Muted for less emphasis */}
          Last updated: {formatTimestamp(data.timestamp, timeZone)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="my-4">
          {getWeatherIcon(data.icon, { size: 80, className: "text-primary" })} {/* Use primary color for icon */}
        </div>
        <p className="text-6xl font-bold mb-2">{data.temperature}°C</p>
        <p className="text-xl capitalize text-card-foreground/90 mb-6">{data.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-sm mb-6">
          <div className="flex items-center space-x-2 p-3 rounded-lg text-card-foreground">
            <Eye className="text-muted-foreground"/>
            <span>Feels like: {data.feelsLike}°C</span>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg text-card-foreground">
            <Droplets className="text-muted-foreground"/>
            <span>Humidity: {data.humidity}%</span>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg text-card-foreground col-span-1 sm:col-span-2">
            <WindIcon className="text-muted-foreground"/>
            <span>Wind: {data.windSpeed} km/h</span>
          </div>
        </div>
        
        {aiScene && aiScene.imageUri && (
          <Badge variant={aiScene.reliability === 'High' || aiScene.reliability === 'Medium' ? 'default' : 'secondary'} className="mt-2 text-xs self-center bg-primary/10 text-primary-foreground border-primary/30">
            <Info className="mr-1.5" size={12} />
            AI Scene: {aiScene.reliability} reliability
          </Badge>
        )}
         {aiScene && !aiScene.imageUri && aiScene.reliability === 'Unavailable' && (
          <Badge variant="outline" className="mt-2 text-xs self-center">
            <Info className="mr-1.5" size={12} />
            AI Scene: Image generation unavailable
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
