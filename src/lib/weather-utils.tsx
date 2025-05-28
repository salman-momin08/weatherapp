
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

// Helper to generate mock AQI data for a given base value
const generateMockAQI = (baseAqiValue: number): AQIData => {
  const aqiValue = Math.max(10, Math.min(500, Math.floor(baseAqiValue + (Math.random() * 50) - 25))); // Ensure AQI is within a reasonable range
  return {
    value: aqiValue,
    category: getAQICategory(aqiValue),
    dominantPollutant: ["PM2.5", "O3", "PM10"][Math.floor(Math.random() * 3)],
    pollutants: [
      { name: "PM2.5", value: Math.max(0, Math.round(aqiValue * (0.6 + Math.random() * 0.4))), unit: "µg/m³" },
      { name: "PM10", value: Math.max(0, Math.round(aqiValue * (0.8 + Math.random() * 0.4))), unit: "µg/m³" },
      { name: "O3", value: Math.max(0, Math.round(aqiValue * (0.3 + Math.random() * 0.4))), unit: "ppb" },
      { name: "NO2", value: Math.max(0, Math.round(aqiValue * (0.2 + Math.random() * 0.2))), unit: "ppb" },
      { name: "SO2", value: Math.max(0, Math.round(aqiValue * (0.1 + Math.random() * 0.2))), unit: "ppb" },
      { name: "CO", value: Math.max(0, Math.round(aqiValue * (0.05 + Math.random() * 0.1))), unit: "ppm" },
    ].filter(p => p.value > 0), // Filter out pollutants with 0 value for cleaner display
  };
};

// Helper to generate mock hourly forecast data
const generateMockHourlyForecast = (baseTemp: number, conditions: string[], icons: string[]): HourlyForecastData[] => {
  const hourly: HourlyForecastData[] = [];
  const currentHour = new Date().getHours(); // For a future day, this would typically start from 0 or relevant hour
  for (let i = 0; i < 12; i++) { // Generate 12 hours of forecast data
    const hour = (currentHour + i) % 24; // Simplified for mock; real API would give specific hours for the day
    const hourRandomIndex = Math.floor(Math.random() * conditions.length);
    hourly.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      temperature: Math.round(baseTemp + Math.floor(Math.random() * 6) - 3), // Temperature variation throughout the day
      description: conditions[hourRandomIndex],
      icon: icons[hourRandomIndex],
    });
  }
  return hourly;
};


// Mock function to simulate fetching weather data
export const getMockWeatherData = async (location: string): Promise<WeatherData> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const baseTemp = 15 + (location.length % 15); // Base temperature between 15 and 29
  const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Thunderstorm', 'Snowy', 'Foggy', 'Drizzle', 'Clear'];
  const icons = ['Sun', 'Cloud', 'CloudRain', 'CloudSun', 'CloudLightning', 'CloudSnow', 'CloudFog', 'CloudDrizzle', 'Sun']; // Added Clear mapping to Sun for simplicity
  
  const currentRandomIndex = Math.floor(Math.random() * weatherConditions.length);
  const current: CurrentWeatherData = {
    locationName: location.startsWith("coords:") ? "Current Location" : location,
    temperature: baseTemp + Math.floor(Math.random() * 5) - 2,
    humidity: 50 + (location.length % 30),
    description: weatherConditions[currentRandomIndex],
    icon: icons[currentRandomIndex],
    windSpeed: 5 + (location.length % 10),
    feelsLike: baseTemp + Math.floor(Math.random() * 5) - 4,
    timestamp: Date.now() / 1000,
  };

  const forecast: ForecastDayData[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i); // Daily forecast, including today as the first item if i=0
    
    const dayTempVariation = Math.floor(Math.random() * 5) - 2; // +/- 2 from base
    const dayBaseTemp = baseTemp + dayTempVariation;
    const dayRandomIndex = Math.floor(Math.random() * weatherConditions.length);

    forecast.push({
      date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      temp_high: dayBaseTemp + 5 + Math.floor(Math.random() * 3) - 1,
      temp_low: dayBaseTemp - 2 + Math.floor(Math.random() * 3) - 1,
      description: weatherConditions[dayRandomIndex],
      icon: icons[dayRandomIndex],
      aqi: generateMockAQI(20 + (location.length % 100) + (i * 5)), // AQI varies slightly per day
      hourlyForecast: generateMockHourlyForecast(dayBaseTemp, weatherConditions, icons),
    });
  }

  // Current day's AQI and Hourly from the first item of the forecast (today's data)
  const currentDayForecast = forecast[0];

  return { 
    current, 
    forecast, 
    aqi: currentDayForecast?.aqi, 
    hourlyForecast: currentDayForecast?.hourlyForecast 
  };
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
    Zap, 
    Leaf, 
    CloudDrizzle,
    Clear: Sun, // Map 'Clear' to Sun icon
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
