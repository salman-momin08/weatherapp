
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
}

export interface WeatherData {
  current: CurrentWeatherData;
  forecast: ForecastDayData[];
}

export interface AIWeatherScene {
  imageUri: string | null;
  reliability: string | null;
}
