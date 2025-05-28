
// src/components/ForecastItem.tsx
"use client";

import type { ForecastDayData } from '@/types/weather';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWeatherIcon } from '@/lib/weather-utils';
import { cn } from '@/lib/utils';

interface ForecastItemProps {
  data: ForecastDayData;
  onClick: () => void;
  isSelected?: boolean;
}

export function ForecastItem({ data, onClick, isSelected }: ForecastItemProps) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-36 text-center shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "bg-gradient-to-br from-primary/70 to-background/60 backdrop-blur-sm text-primary-foreground", // Gradient background, adjusted text
        isSelected && "ring-2 ring-primary-foreground border-primary-foreground" // Adjusted selection ring for contrast
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-pressed={isSelected}
      aria-label={`Forecast for ${data.date}, high ${Math.round(data.temp_high)} degrees, low ${Math.round(data.temp_low)} degrees, ${data.description}`}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{data.date.split(',')[0]}</CardTitle>
        <CardDescription className="text-xs text-primary-foreground/80">{data.date.substring(data.date.indexOf(',') + 2)}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex flex-col items-center">
        <div className="my-2">
          {getWeatherIcon(data.icon, { size: 36, className: "text-white" })} {/* Icon color for visibility */}
        </div>
        <p className="text-lg font-semibold">{Math.round(data.temp_high)}° / {Math.round(data.temp_low)}°</p>
        <p className="text-xs capitalize text-primary-foreground/80 mt-1 h-8 overflow-hidden text-ellipsis">{data.description}</p>
      </CardContent>
    </Card>
  );
}

    