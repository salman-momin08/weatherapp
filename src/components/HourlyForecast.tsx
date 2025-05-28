// src/components/HourlyForecast.tsx
"use client";

import type { HourlyForecastData } from '@/types/weather';
import { HourlyForecastItem } from './HourlyForecastItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';

interface HourlyForecastProps {
  data: HourlyForecastData[];
  displayForDate?: string; // e.g., "Today", "Tomorrow", "Mon, Jul 22"
}

export function HourlyForecast({ data, displayForDate }: HourlyForecastProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const title = `Hourly Forecast ${displayForDate ? `for ${displayForDate}` : ''}`;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center justify-center">
          <Clock className="mr-2 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-3 pb-4">
            {data.map((hour, index) => (
              <HourlyForecastItem key={index} data={hour} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
