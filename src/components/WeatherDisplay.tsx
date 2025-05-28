
// src/components/WeatherDisplay.tsx
"use client";

import type { WeatherData, ForecastDayData } from '@/types/weather';
import { CurrentWeather } from './CurrentWeather';
import { ForecastItem } from './ForecastItem';
import { AQIDisplay } from './AQIDisplay';
import { HourlyForecast } from './HourlyForecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarDays, Info } from 'lucide-react';
import { Button } from './ui/button';

interface WeatherDisplayProps {
  weatherData: WeatherData;
  selectedForecastDay: ForecastDayData | null;
  onForecastDaySelect: (day: ForecastDayData | null) => void;
}

export function WeatherDisplay({ weatherData, selectedForecastDay, onForecastDaySelect }: WeatherDisplayProps) {

  const aqiDataToDisplay = selectedForecastDay?.aqi ?? weatherData.aqi;
  const hourlyDataToDisplay = selectedForecastDay?.hourlyForecast ?? weatherData.hourlyForecast;

  let displayDateLabel = "Today";
  if (selectedForecastDay) {
    const dateParts = selectedForecastDay.date.split(',');
    displayDateLabel = dateParts[0]; // e.g., "Mon"

    const today = new Date();
    // Ensure timezone consistency if weatherData.timeZone is available
    const todayDateString = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: weatherData.timeZone || undefined });

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDateString = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: weatherData.timeZone || undefined });

    if (selectedForecastDay.date === todayDateString) {
        displayDateLabel = "Today";
    } else if (selectedForecastDay.date === tomorrowDateString) {
        displayDateLabel = "Tomorrow";
    }
    // If neither, displayDateLabel remains the short day name (e.g., "Mon")
  }


  return (
    <div className="space-y-8 w-full">
      <CurrentWeather data={weatherData.current} timeZone={weatherData.timeZone} aiScene={weatherData.aiScene} />

      {aqiDataToDisplay && (
        <AQIDisplay data={aqiDataToDisplay} displayForDate={displayDateLabel} />
      )}

      {hourlyDataToDisplay && hourlyDataToDisplay.length > 0 && (
        <HourlyForecast data={hourlyDataToDisplay} displayForDate={displayDateLabel} />
      )}

      <Card className="w-full max-w-3xl mx-auto shadow-xl bg-gradient-to-br from-primary/80 to-background/70 backdrop-blur-sm text-card-foreground">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center">
            <CalendarDays className="mr-2 text-primary-foreground" /> 5-Day Forecast {/* Adjusted icon color */}
          </CardTitle>
          <CardContent className="text-xs text-primary-foreground/80 text-center p-0 pt-1"> {/* Adjusted text color */}
            Click on a day to see its detailed AQI and hourly forecast.
            {selectedForecastDay && (
                 <Button
                    variant="link"
                    size="sm"
                    className="text-xs p-0 h-auto ml-2 text-primary-foreground hover:text-white" /* Adjusted link color */
                    onClick={() => onForecastDaySelect(null)}
                >
                    (Show Today's Details)
                </Button>
            )}
          </CardContent>
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

    