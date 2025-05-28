
// src/components/WeatherDisplay.tsx
"use client";

import type { WeatherData, ForecastDayData, AIWeatherScene } from '@/types/weather';
import { CurrentWeather } from './CurrentWeather';
import { ForecastItem } from './ForecastItem';
import { AQIDisplay } from './AQIDisplay';
import { HourlyForecast } from './HourlyForecast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarDays } from 'lucide-react';
import { Button } from './ui/button';

interface WeatherDisplayProps {
  weatherData: WeatherData;
  selectedForecastDay: ForecastDayData | null;
  onForecastDaySelect: (day: ForecastDayData | null) => void;
}

export function WeatherDisplay({ weatherData, selectedForecastDay, onForecastDaySelect }: WeatherDisplayProps) {

  const aqiDataToDisplay = selectedForecastDay?.aqi ?? weatherData.aqi;
  const hourlyDataToDisplay = selectedForecastDay?.hourlyForecast ?? weatherData.hourlyForecast;
  const aiSceneToDisplay = weatherData.aiScene; // Always pass current AI scene to CurrentWeather

  let displayDateLabel = "Today";
  if (selectedForecastDay) {
    const dateParts = selectedForecastDay.date.split(',');
    displayDateLabel = dateParts[0]; 

    const today = new Date();
    const todayDateString = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: weatherData.timeZone || undefined });

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDateString = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: weatherData.timeZone || undefined });

    if (selectedForecastDay.date === todayDateString) {
        displayDateLabel = "Today";
    } else if (selectedForecastDay.date === tomorrowDateString) {
        displayDateLabel = "Tomorrow";
    }
  }

  return (
    <div className="space-y-8 w-full">
      <CurrentWeather data={weatherData.current} timeZone={weatherData.timeZone} aiScene={aiSceneToDisplay} />

      {aqiDataToDisplay && (
        <AQIDisplay data={aqiDataToDisplay} displayForDate={displayDateLabel} />
      )}

      {hourlyDataToDisplay && hourlyDataToDisplay.length > 0 && (
        <HourlyForecast data={hourlyDataToDisplay} displayForDate={displayDateLabel} />
      )}

      <Card className="w-full max-w-3xl mx-auto shadow-xl bg-card text-card-foreground"> {/* White card */}
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center">
            <CalendarDays className="mr-2 text-primary" /> 5-Day Forecast {/* Primary color for icon */}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground text-center p-0 pt-1">
            Click on a day to see its detailed AQI and hourly forecast.
            {selectedForecastDay && (
                 <Button
                    variant="link"
                    size="sm"
                    className="text-xs p-0 h-auto ml-2 text-accent hover:text-accent/80"
                    onClick={() => onForecastDaySelect(null)}
                >
                    (Show Today's Details)
                </Button>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {weatherData.forecast.map((day, index) => (
                <ForecastItem
                  key={index}
                  data={day}
                  onClick={() => onForecastDaySelect(day)}
                  isSelected={selectedForecastDay?.date === day.date}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
