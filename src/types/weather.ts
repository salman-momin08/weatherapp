
export interface AQIPollutant {
  name: string; // e.g., "PM2.5", "O3"
  value: number;
  unit: string; // e.g., "µg/m³", "ppm"
}

export interface AQIData {
  value: number; // Overall AQI value
  category: string; // e.g., "Good", "Moderate", "Unhealthy"
  dominantPollutant?: string; // Optional: e.g., "PM2.5"
  pollutants: AQIPollutant[];
}

export interface HourlyForecastData {
  time: string; // e.g., "3 PM", "15:00"
  temperature: number;
  description: string;
  icon: string; // Icon code or name
}

export interface CurrentWeatherData {
  locationName: string;
  temperature: number;
  humidity: number;
  description: string;
  icon: string; // Icon code or name (e.g., '01d', 'Sun')
  windSpeed: number;
  feelsLike: number;
  timestamp: number; // Unix timestamp
}

export interface ForecastDayData {
  date: string; // Formatted date string, e.g., "Mon, Jul 22"
  temp_high: number;
  temp_low: number;
  description: string;
  icon: string; // Icon code or name
  aqi?: AQIData; // AQI specific to this forecast day
  hourlyForecast?: HourlyForecastData[]; // Hourly forecast specific to this day
}

export interface AIWeatherScene {
  imageUri: string; // Data URI for the generated image
  prompt: string;
  reliability: 'High' | 'Medium' | 'Low' | 'Experimental' | 'Unavailable';
  modelUsed?: string;
}

// Renamed original WeatherData to WeatherDataCore
export interface WeatherDataCore {
  current: CurrentWeatherData;
  forecast: ForecastDayData[];
  aqi?: AQIData;
  hourlyForecast?: HourlyForecastData[];
  timeZone?: string;
  resolvedLat?: number;
  resolvedLon?: number;
  aiScene?: AIWeatherScene;
}

// New result type for the server action
export type WeatherDataResult =
  | { success: true; data: WeatherDataCore }
  | { success: false; error: string };

