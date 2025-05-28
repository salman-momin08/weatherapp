
// src/components/HourlyForecastItem.tsx
"use client";

import type { HourlyForecastData } from '@/types/weather';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWeatherIcon } from '@/lib/weather-utils';

interface HourlyForecastItemProps {
  data: HourlyForecastData;
}

export function HourlyForecastItem({ data }: HourlyForecastItemProps) {
  return (
    <Card className="flex-shrink-0 w-28 text-center shadow-md bg-card/70 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="p-2 pb-0">
        <CardTitle className="text-sm font-medium">{data.time}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-1 flex flex-col items-center">
        <div className="my-1">
          {getWeatherIcon(data.icon, { size: 32, className: "text-accent" })}
        </div>
        <p className="text-lg font-semibold">{Math.round(data.temperature)}°C</p>
        <p className="text-xs capitalize text-muted-foreground mt-1 h-4 overflow-hidden text-ellipsis whitespace-nowrap">
            {data.description}
        </p>
      </CardContent>
    </Card>
  );
}
