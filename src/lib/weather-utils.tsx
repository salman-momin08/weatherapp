
import type { CurrentWeatherData, ForecastDayData, WeatherData, AQIData, AQIPollutant, HourlyForecastData } from '@/types/weather';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudSun, Moon, CloudMoon, CloudLightning, Wind, CloudFog, Thermometer, Droplets, WindIcon, Eye, CalendarDays, Clock, Zap, Leaf, CloudDrizzle
} from 'lucide-react'; // Added Moon, CloudMoon
import type { LucideProps } from 'lucide-react';
import type { FC } from 'react';

// getWeatherIcon remains useful for mapping app-specific icon names to Lucide components
export const getWeatherIcon = (iconName: string, props?: LucideProps): JSX.Element => {
  const iconMap: { [key: string]: FC<LucideProps> } = {
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudSun,
    Moon, // Added Moon
    CloudMoon, // Added CloudMoon
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
    Clear: Sun, 
  };

  const IconComponent = iconMap[iconName] || Sun; // Default to Sun icon
  return <IconComponent {...props} />;
};

// Format timestamp to readable date/time
export const formatTimestamp = (timestamp: number, timeZone?: string): string => {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone // Optional: pass timezone from API for accuracy
  });
};

// The getMockWeatherData function is no longer needed as we are fetching real data.
// It can be removed.
// The dynamic mock data generation is also removed from weatherActions.ts.

    