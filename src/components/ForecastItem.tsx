// src/components/ForecastItem.tsx
"use client";

import type { ForecastDayData } from '@/types/weather';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWeatherIcon } from '@/lib/weather-utils';

interface ForecastItemProps {
  data: ForecastDayData;
}

export function ForecastItem({ data }: ForecastItemProps) {
  return (
    <Card className="flex-shrink-0 w-36 text-center shadow-md bg-card/70 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{data.date.split(',')[0]}</CardTitle>
        <CardDescription className="text-xs">{data.date.substring(data.date.indexOf(',') + 2)}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex flex-col items-center">
        <div className="my-2">
          {getWeatherIcon(data.icon, { size: 36, className: "text-accent" })}
        </div>
        <p className="text-lg font-semibold">{Math.round(data.temp_high)}° / {Math.round(data.temp_low)}°</p>
        <p className="text-xs capitalize text-muted-foreground mt-1 h-8 overflow-hidden text-ellipsis">{data.description}</p>
      </CardContent>
    </Card>
  );
}
