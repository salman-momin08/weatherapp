
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

export interface WeatherData {
  current: CurrentWeatherData;
  forecast: ForecastDayData[];
  aqi?: AQIData;
  hourlyForecast?: HourlyForecastData[];
  timeZone?: string;
  resolvedLat?: number; // Added for reliably saving coordinates
  resolvedLon?: number; // Added for reliably saving coordinates
}

// AIWeatherScene type removed
// export interface AIWeatherScene {
//   imageUri: string | null;
//   reliability: string | null;
// }
