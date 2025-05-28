
// src/components/CurrentWeather.tsx
"use client";

import type { CurrentWeatherData } from '@/types/weather';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getWeatherIcon, formatTimestamp } from '@/lib/weather-utils';
import { Thermometer, Droplets, WindIcon, Eye, MapPin } from 'lucide-react'; // Removed Info icon

interface CurrentWeatherProps {
  data: CurrentWeatherData;
  timeZone?: string;
  // Removed aiScene prop
}

export function CurrentWeather({ data, timeZone }: CurrentWeatherProps) {
  return (
    <Card className="w-full max-w-md mx-auto mb-8 shadow-xl bg-gradient-to-br from-primary/80 to-background/70 backdrop-blur-sm text-card-foreground">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center text-center mb-1">
          <MapPin className="h-7 w-7 mr-2 text-card-foreground" /> {/* Changed to text-card-foreground */}
          <CardTitle className="text-3xl font-bold">{data.locationName}</CardTitle>
        </div>
        <CardDescription className="text-center text-sm text-card-foreground/80"> {/* Changed to text-card-foreground/80 */}
          Last updated: {formatTimestamp(data.timestamp, timeZone)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="my-4">
          {getWeatherIcon(data.icon, { size: 80, className: "text-card-foreground" })} {/* Changed to text-card-foreground */}
        </div>
        <p className="text-6xl font-bold mb-2">{data.temperature}°C</p>
        <p className="text-xl capitalize text-card-foreground/90 mb-6">{data.description}</p> {/* Changed to text-card-foreground/90 */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-sm mb-6">
          {/* Applying frosted glass to these inner details */}
          <div className="flex items-center space-x-2 p-3 bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 text-foreground">
            <Eye /> {/* Icon color will inherit from text-foreground */}
            <span>Feels like: {data.feelsLike}°C</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 text-foreground">
            <Droplets />
            <span>Humidity: {data.humidity}%</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 text-foreground col-span-1 sm:col-span-2">
            <WindIcon />
            <span>Wind: {data.windSpeed} km/h</span>
          </div>
        </div>
        
        {/* Removed AI Scene reliability badge */}
      </CardContent>
    </Card>
  );
}
