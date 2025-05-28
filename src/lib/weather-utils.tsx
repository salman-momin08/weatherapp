import type { CurrentWeatherData, ForecastDayData, WeatherData } from '@/types/weather';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudSun, CloudMoon, CloudLightning, Wind, CloudFog, Thermometer, Droplets, WindIcon, Eye, CalendarDays
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { FC } from 'react';

// Mock function to simulate fetching weather data
export const getMockWeatherData = async (location: string): Promise<WeatherData> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simple logic to vary data based on location string length for variety
  const baseTemp = 15 + (location.length % 15); // Base temperature between 15 and 29

  const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Thunderstorm', 'Snowy', 'Foggy'];
  const icons = ['Sun', 'Cloud', 'CloudRain', 'CloudSun', 'CloudLightning', 'CloudSnow', 'CloudFog'];
  
  const randomIndex = Math.floor(Math.random() * weatherConditions.length);

  const current: CurrentWeatherData = {
    locationName: location.startsWith("coords:") ? "Current Location" : location,
    temperature: baseTemp + Math.floor(Math.random() * 5) - 2, // +/- 2 variation
    humidity: 50 + (location.length % 30), // Humidity between 50 and 79
    description: weatherConditions[randomIndex],
    icon: icons[randomIndex],
    windSpeed: 5 + (location.length % 10), // Wind speed between 5 and 14 km/h
    feelsLike: baseTemp + Math.floor(Math.random() * 5) - 4,
    timestamp: Date.now() / 1000,
  };

  const forecast: ForecastDayData[] = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i + 1);
    const dayRandomIndex = Math.floor(Math.random() * weatherConditions.length);

    forecast.push({
      date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      temp_high: baseTemp + 5 + Math.floor(Math.random() * 3) - 1,
      temp_low: baseTemp - 2 + Math.floor(Math.random() * 3) - 1,
      description: weatherConditions[dayRandomIndex],
      icon: icons[dayRandomIndex],
    });
  }

  return { current, forecast };
};

// Helper to get Lucide icon component
export const getWeatherIcon = (iconName: string, props?: LucideProps): JSX.Element => {
  const iconMap: { [key: string]: FC<LucideProps> } = {
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudSun,
    CloudMoon, // For partly cloudy at night, if API provides
    CloudLightning,
    Wind,
    CloudFog,
    Thermometer,
    Droplets,
    WindIcon,
    Eye,
    CalendarDays,
  };

  const IconComponent = iconMap[iconName] || Sun; // Default to Sun icon
  return <IconComponent {...props} />;
};

// Format timestamp to readable date/time
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
