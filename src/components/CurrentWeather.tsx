
// src/components/CurrentWeather.tsx
"use client";

import type { CurrentWeatherData, AIWeatherScene } from '@/types/weather'; // Updated to include AIWeatherScene if needed for reliability message
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getWeatherIcon, formatTimestamp } from '@/lib/weather-utils';
import { Thermometer, Droplets, WindIcon, Eye, Info, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CurrentWeatherProps {
  data: CurrentWeatherData;
  timeZone?: string;
  aiScene?: AIWeatherScene | null; // Optional AI scene data
}

export function CurrentWeather({ data, timeZone, aiScene }: CurrentWeatherProps) {
  return (
    <Card className="w-full max-w-md mx-auto mb-8 shadow-xl bg-gradient-to-br from-primary/80 to-accent/80 backdrop-blur-sm text-card-foreground">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center text-center mb-1">
          <MapPin className="h-7 w-7 mr-2 text-primary-foreground" /> {/* Adjusted for contrast on gradient */}
          <CardTitle className="text-3xl font-bold">{data.locationName}</CardTitle>
        </div>
        <CardDescription className="text-center text-sm text-primary-foreground/80"> {/* Adjusted for contrast */}
          Last updated: {formatTimestamp(data.timestamp, timeZone)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="my-4">
          {getWeatherIcon(data.icon, { size: 80, className: "text-white" })} {/* Icon color for visibility */}
        </div>
        <p className="text-6xl font-bold mb-2">{data.temperature}°C</p>
        <p className="text-xl capitalize text-primary-foreground/90 mb-6">{data.description}</p> {/* Adjusted for contrast */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-sm mb-6">
          <div className="flex items-center space-x-2 p-3 bg-background/20 rounded-md"> {/* Lighter bg for contrast */}
            <Eye className="text-primary-foreground/90" />
            <span>Feels like: {data.feelsLike}°C</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-background/20 rounded-md">
            <Droplets className="text-primary-foreground/90" />
            <span>Humidity: {data.humidity}%</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-background/20 rounded-md col-span-1 sm:col-span-2">
            <WindIcon className="text-primary-foreground/90" />
            <span>Wind: {data.windSpeed} km/h</span>
          </div>
        </div>
        
        {aiScene?.reliability && (
          <Badge variant="outline" className="mt-4 p-2 text-xs text-center bg-background/70 backdrop-blur-sm border-border text-foreground/80">
            <Info className="mr-1 inline-block text-primary" size={14} /> {aiScene.reliability}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
