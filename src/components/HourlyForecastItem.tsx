
// src/components/HourlyForecastItem.tsx
"use client";

import type { HourlyForecastData } from '@/types/weather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card component might not be needed if we restyle directly
import { getWeatherIcon } from '@/lib/weather-utils';

interface HourlyForecastItemProps {
  data: HourlyForecastData;
}

export function HourlyForecastItem({ data }: HourlyForecastItemProps) {
  return (
    // Apply frosted glass effect here
    <div className="flex-shrink-0 w-28 text-center shadow-md rounded-lg p-2
                   bg-white/20 backdrop-blur-md border border-white/30 text-foreground">
      <div className="text-sm font-medium mb-1">{data.time}</div>
      <div className="my-1">
        {getWeatherIcon(data.icon, { size: 32, className: "mx-auto" })} {/* Icon inherits text-foreground */}
      </div>
      <div className="text-lg font-semibold">{Math.round(data.temperature)}°C</div>
      <div className="text-xs capitalize mt-1 h-4 overflow-hidden text-ellipsis whitespace-nowrap text-foreground/80">
        {data.description}
      </div>
    </div>
  );
}
