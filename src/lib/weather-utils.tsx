
import type { CurrentWeatherData, ForecastDayData, WeatherData, AQIData, AQIPollutant, HourlyForecastData } from '@/types/weather';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudSun, CloudMoon, CloudLightning, Wind, CloudFog, Thermometer, Droplets, WindIcon, Eye, CalendarDays, Clock, Zap, Leaf, CloudDrizzle
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { FC } from 'react';

const getAQICategory = (aqiValue: number): string => {
  if (aqiValue <= 50) return "Good";
  if (aqiValue <= 100) return "Moderate";
  if (aqiValue <= 150) return "Unhealthy for Sensitive Groups";
  if (aqiValue <= 200) return "Unhealthy";
  if (aqiValue <= 300) return "Very Unhealthy";
  return "Hazardous";
};

// Mock function to simulate fetching weather data
export const getMockWeatherData = async (location: string): Promise<WeatherData> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simple logic to vary data based on location string length for variety
  const baseTemp = 15 + (location.length % 15); // Base temperature between 15 and 29

  const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Thunderstorm', 'Snowy', 'Foggy', 'Drizzle'];
  const icons = ['Sun', 'Cloud', 'CloudRain', 'CloudSun', 'CloudLightning', 'CloudSnow', 'CloudFog', 'CloudDrizzle'];
  
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
  for (let i = 0; i < 7; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i + 1); // Daily forecast starts from tomorrow
    const dayRandomIndex = Math.floor(Math.random() * weatherConditions.length);

    forecast.push({
      date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      temp_high: baseTemp + 5 + Math.floor(Math.random() * 3) - 1,
      temp_low: baseTemp - 2 + Math.floor(Math.random() * 3) - 1,
      description: weatherConditions[dayRandomIndex],
      icon: icons[dayRandomIndex],
    });
  }

  const mockAqiValue = 20 + (location.length % 281); // AQI between 20 and 300
  const aqi: AQIData = {
    value: mockAqiValue,
    category: getAQICategory(mockAqiValue),
    dominantPollutant: "PM2.5",
    pollutants: [
      { name: "PM2.5", value: Math.round(mockAqiValue * 0.8), unit: "µg/m³" },
      { name: "PM10", value: Math.round(mockAqiValue * 1.2), unit: "µg/m³" },
      { name: "O3", value: Math.round(mockAqiValue * 0.5), unit: "ppb" },
      { name: "NO2", value: Math.round(mockAqiValue * 0.3), unit: "ppb" },
      { name: "SO2", value: Math.round(mockAqiValue * 0.2), unit: "ppb" },
      { name: "CO", value: Math.round(mockAqiValue * 0.1), unit: "ppm" },
    ]
  };

  const hourlyForecast: HourlyForecastData[] = [];
  const currentHour = new Date().getHours();
  for (let i = 0; i < 12; i++) { // Next 12 hours
    const hour = (currentHour + i + 1) % 24;
    const hourRandomIndex = Math.floor(Math.random() * weatherConditions.length);
    hourlyForecast.push({
      time: `${hour}:00`,
      temperature: current.temperature + Math.floor(Math.random() * 4) - 2, // slight variation from current
      description: weatherConditions[hourRandomIndex],
      icon: icons[hourRandomIndex]
    });
  }

  return { current, forecast, aqi, hourlyForecast };
};

// Helper to get Lucide icon component
export const getWeatherIcon = (iconName: string, props?: LucideProps): JSX.Element => {
  const iconMap: { [key: string]: FC<LucideProps> } = {
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudSun,
    CloudMoon,
    CloudLightning,
    Wind,
    CloudFog,
    Thermometer,
    Droplets,
    WindIcon,
    Eye,
    CalendarDays,
    Clock,
    Zap, // For thunderstorm, alternative to CloudLightning if needed
    Leaf, // Generic nature/air quality icon
    CloudDrizzle,
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

