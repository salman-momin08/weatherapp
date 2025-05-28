
// src/components/HourlyForecastItem.tsx
"use client";

import type { HourlyForecastData } from '@/types/weather';
import { getWeatherIcon } from '@/lib/weather-utils';

interface HourlyForecastItemProps {
  data: HourlyForecastData;
}

export function HourlyForecastItem({ data }: HourlyForecastItemProps) {
  return (
    <div className="flex-shrink-0 w-28 text-center shadow-sm rounded-lg p-3 bg-background border border-border text-card-foreground"> {/* Subtle inner item on card background */}
      <div className="text-sm font-medium mb-1">{data.time}</div>
      <div className="my-1">
        {getWeatherIcon(data.icon, { size: 32, className: "mx-auto text-primary" })} {/* Primary color for icon */}
      </div>
      <div className="text-lg font-semibold">{Math.round(data.temperature)}°C</div>
      <div className="text-xs capitalize mt-1 h-4 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
        {data.description}
      </div>
    </div>
  );
}
