
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
        "bg-card text-card-foreground", // Default white card
        isSelected && "ring-2 ring-accent border-accent" // Accent ring for selection
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-pressed={isSelected}
      aria-label={`Forecast for ${data.date}, high ${Math.round(data.temp_high)} degrees, low ${Math.round(data.temp_low)} degrees, ${data.description}`}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{data.date.split(',')[0]}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{data.date.substring(data.date.indexOf(',') + 2)}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex flex-col items-center">
        <div className="my-2">
          {getWeatherIcon(data.icon, { size: 36, className: "text-primary" })} {/* Primary color for icon */}
        </div>
        <p className="text-lg font-semibold">{Math.round(data.temp_high)}° / {Math.round(data.temp_low)}°</p>
        <p className="text-xs capitalize text-muted-foreground mt-1 h-8 overflow-hidden text-ellipsis">{data.description}</p>
      </CardContent>
    </Card>
  );
}
