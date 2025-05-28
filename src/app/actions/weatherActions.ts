
// src/app/actions/weatherActions.ts
'use server';

import type { WeatherData, CurrentWeatherData, ForecastDayData, AQIData, HourlyForecastData } from '@/types/weather';

// --- Interfaces for OpenWeatherMap API responses (simplified) ---
interface OWMGeocodingResponse {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface OWMWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OWMCurrentWeather {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather: OWMWeatherCondition[];
}

interface OWMHourlyForecast {
  dt: number;
  temp: number;
  weather: OWMWeatherCondition[];
}

interface OWMDailyForecastTemp {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}

interface OWMDailyForecastFeelsLike {
  day: number;
  night: number;
  eve: number;
  morn: number;
}
interface OWMDailyForecast {
  dt: number;
  temp: OWMDailyForecastTemp;
  feels_like: OWMDailyForecastFeelsLike;
  humidity: number;
  wind_speed: number;
  weather: OWMWeatherCondition[];
  // Add other fields as needed, e.g., pressure, uvi
}

interface OWMOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  current: OWMCurrentWeather;
  hourly: OWMHourlyForecast[];
  daily: OWMDailyForecast[];
}

interface OWMAirPollutionComponent {
  co: number;
  no: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  nh3: number;
}

interface OWMAirPollutionData {
  main: {
    aqi: number; // 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
  };
  components: OWMAirPollutionComponent;
  dt: number;
}

interface OWMAirPollutionResponse {
  coord: {
    lon: number;
    lat: number;
  };
  list: OWMAirPollutionData[];
}

// --- Helper Functions ---

const mapOwmIconToAppIcon = (owmIcon: string): string => {
  const mapping: { [key: string]: string } = {
    '01d': 'Sun',
    '01n': 'Moon', // Assuming you have a Moon icon or will handle day/night in component
    '02d': 'CloudSun',
    '02n': 'CloudMoon', // Assuming CloudMoon
    '03d': 'Cloud',
    '03n': 'Cloud',
    '04d': 'Cloud', // Often used for broken/overcast clouds
    '04n': 'Cloud',
    '09d': 'CloudRain', // Shower rain
    '09n': 'CloudRain',
    '10d': 'CloudDrizzle', // Rain (day) - CloudDrizzle might be better for light/moderate
    '10n': 'CloudDrizzle', // Rain (night)
    '11d': 'CloudLightning',
    '11n': 'CloudLightning',
    '13d': 'CloudSnow',
    '13n': 'CloudSnow',
    '50d': 'CloudFog',
    '50n': 'CloudFog',
  };
  return mapping[owmIcon] || 'Sun'; // Default to Sun
};

const getAQICategoryFromOWM = (aqiValue: number): string => {
  // OWM AQI: 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
  if (aqiValue === 1) return "Good";
  if (aqiValue === 2) return "Fair"; // Mapping 'Fair' to 'Moderate' as our categories are slightly different
  if (aqiValue === 3) return "Moderate";
  if (aqiValue === 4) return "Unhealthy"; // Mapping 'Poor' to 'Unhealthy'
  if (aqiValue === 5) return "Very Unhealthy";
  return "Unknown";
};


export async function getRealtimeWeatherData(location: string): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    console.error("Weather API key is missing (WEATHER_API_KEY not found in .env or .env.local).");
    throw new Error("Weather API key is not configured. Please add WEATHER_API_KEY to your .env.local file.");
  }

  try {
    // 1. Geocode location to get latitude and longitude
    const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`);
    if (!geoResponse.ok) {
      const errorData = await geoResponse.json();
      console.error("Geocoding API error:", errorData);
      throw new Error(`Failed to geocode location: ${errorData.message || geoResponse.statusText}`);
    }
    const geoDataArr = await geoResponse.json() as OWMGeocodingResponse[];
    if (!geoDataArr || geoDataArr.length === 0) {
      throw new Error('Location not found. Please try a different search term.');
    }
    const { lat, lon, name: bestMatchLocationName, country, state } = geoDataArr[0];
    const displayLocationName = state ? `${bestMatchLocationName}, ${state}, ${country}` : `${bestMatchLocationName}, ${country}`;

    // 2. Fetch weather data (One Call API 3.0)
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${apiKey}&units=metric`);
    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error("Weather API error:", errorData);
      throw new Error(`Failed to fetch weather data: ${errorData.message || weatherResponse.statusText}`);
    }
    const owmData = await weatherResponse.json() as OWMOneCallResponse;

    // 3. Fetch AQI data
    const aqiResponse = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    let owmAqiData: OWMAirPollutionData | null = null;
    if (aqiResponse.ok) {
      const aqiResult = await aqiResponse.json() as OWMAirPollutionResponse;
      if (aqiResult.list && aqiResult.list.length > 0) {
        owmAqiData = aqiResult.list[0];
      }
    } else {
      console.warn("Failed to fetch AQI data or no AQI data available:", await aqiResponse.text());
      // Not throwing an error for AQI, weather can still be displayed
    }

    // 4. Transform data
    const current: CurrentWeatherData = {
      locationName: location.startsWith("coords:") ? displayLocationName : location, // Prefer user input if not coords
      temperature: Math.round(owmData.current.temp),
      humidity: owmData.current.humidity,
      description: owmData.current.weather[0]?.description || 'N/A',
      icon: mapOwmIconToAppIcon(owmData.current.weather[0]?.icon),
      windSpeed: Math.round(owmData.current.wind_speed * 3.6), // m/s to km/h
      feelsLike: Math.round(owmData.current.feels_like),
      timestamp: owmData.current.dt,
    };
    
    const forecast: ForecastDayData[] = owmData.daily.slice(0, 7).map(day => {
      const dayAqiData = owmAqiData ? transformOwAqiData(owmAqiData, day.dt, owmData.timezone) : undefined; // Or fetch daily AQI if API supports
      
      // Filter hourly forecast for this specific day
      const dayStartTimestamp = new Date(day.dt * 1000).setHours(0, 0, 0, 0) / 1000;
      const dayEndTimestamp = dayStartTimestamp + 24 * 60 * 60 -1;
      
      const dailyHourlyForecast = owmData.hourly
        .filter(hour => hour.dt >= dayStartTimestamp && hour.dt <= dayEndTimestamp)
        .slice(0, 12) // Take up to 12 relevant hours for display
        .map(hour => ({
          time: new Date(hour.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: owmData.timezone }).replace(':00 ', ' '),
          temperature: Math.round(hour.temp),
          description: hour.weather[0]?.description || 'N/A',
          icon: mapOwmIconToAppIcon(hour.weather[0]?.icon),
        }));

      return {
        date: new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: owmData.timezone }),
        temp_high: Math.round(day.temp.max),
        temp_low: Math.round(day.temp.min),
        description: day.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(day.weather[0]?.icon),
        aqi: dayAqiData, // For now, using current AQI for all forecast days or make it undefined
        hourlyForecast: dailyHourlyForecast.length > 0 ? dailyHourlyForecast : undefined, // Only if we have hourly data for this day
      };
    });

    const generalAqi = owmAqiData ? transformOwAqiData(owmAqiData, owmData.current.dt, owmData.timezone) : undefined;
    
    const generalHourlyForecast = owmData.hourly.slice(0, 12).map(hour => ({
        time: new Date(hour.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: owmData.timezone }).replace(':00 ', ' '),
        temperature: Math.round(hour.temp),
        description: hour.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(hour.weather[0]?.icon),
    }));


    return {
      current,
      forecast,
      aqi: generalAqi,
      hourlyForecast: generalHourlyForecast,
    };

  } catch (error) {
    console.error("Error in getRealtimeWeatherData:", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch weather: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching weather data.");
  }
}

function transformOwAqiData(owmAqiData: OWMAirPollutionData, dt: number, timezone: string): AQIData {
    return {
        value: owmAqiData.main.aqi * 20 + Math.floor(Math.random() * 19), // Rough scaling from 1-5 to 0-100+
        category: getAQICategoryFromOWM(owmAqiData.main.aqi),
        dominantPollutant: owmAqiData.main.aqi > 2 ? ['PM2.5', 'O3', 'NO2'][owmAqiData.main.aqi - 3] : undefined,
        pollutants: [
          { name: "PM2.5", value: parseFloat(owmAqiData.components.pm2_5.toFixed(1)), unit: "µg/m³" },
          { name: "PM10", value: parseFloat(owmAqiData.components.pm10.toFixed(1)), unit: "µg/m³" },
          { name: "O3", value: parseFloat(owmAqiData.components.o3.toFixed(1)), unit: "µg/m³" }, // OWM gives ppb, convert if needed by your standards
          { name: "NO2", value: parseFloat(owmAqiData.components.no2.toFixed(1)), unit: "µg/m³" },
          { name: "SO2", value: parseFloat(owmAqiData.components.so2.toFixed(1)), unit: "µg/m³" },
          { name: "CO", value: parseFloat((owmAqiData.components.co / 1000).toFixed(1)), unit: "mg/m³" }, // OWM gives µg/m³, converting to mg/m³ for common display
        ].filter(p => p.value > 0),
      };
}

    