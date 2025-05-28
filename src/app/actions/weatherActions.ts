
// src/app/actions/weatherActions.ts
'use server';

import type { WeatherData, CurrentWeatherData, ForecastDayData, AQIData, HourlyForecastData } from '@/types/weather';

// --- Interfaces for OpenWeatherMap API responses (standard APIs) ---
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

// For /data/2.5/weather (Current Weather)
interface OWMCurrentWeatherAPIResponse {
  coord: { lon: number; lat: number };
  weather: OWMWeatherCondition[];
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: { all: number };
  dt: number; // UTC timestamp
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number; // UTC timestamp
    sunset: number;  // UTC timestamp
  };
  timezone: number; // Shift in seconds from UTC
  id: number;
  name: string; // City name
  cod: number;
}

// For /data/2.5/forecast (5 day / 3 hour forecast)
interface OWMForecastListItem {
  dt: number; // UTC timestamp
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level: number;
    grnd_level: number;
    humidity: number;
    temp_kf: number;
  };
  weather: OWMWeatherCondition[];
  clouds: { all: number };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility: number;
  pop: number; // Probability of precipitation
  sys: { pod: 'd' | 'n' }; // Part of the day (d = day, n = night)
  dt_txt: string; // Data/time UTC string e.g., "2024-07-25 12:00:00"
}

interface OWMCity {
  id: number;
  name: string;
  coord: { lat: number; lon: number };
  country: string;
  population: number;
  timezone: number; // Shift in seconds from UTC
  sunrise: number; // UTC timestamp
  sunset: number;  // UTC timestamp
}

interface OWMForecastAPIResponse {
  cod: string;
  message: number | string;
  cnt: number; // Number of 3-hour forecast periods
  list: OWMForecastListItem[];
  city: OWMCity;
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
    '01n': 'Moon',
    '02d': 'CloudSun',
    '02n': 'CloudMoon',
    '03d': 'Cloud',
    '03n': 'Cloud',
    '04d': 'Cloud', // Often used for broken/overcast clouds (consider CloudIcon from Lucide)
    '04n': 'Cloud',
    '09d': 'CloudRain', // Shower rain
    '09n': 'CloudRain',
    '10d': 'CloudDrizzle', // Rain (day)
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
  if (aqiValue === 2) return "Fair";
  if (aqiValue === 3) return "Moderate";
  if (aqiValue === 4) return "Unhealthy";
  if (aqiValue === 5) return "Very Unhealthy";
  return "Unknown";
};

// Helper to get an IANA timezone string from a UTC offset in seconds
// This is a simplified mapping and might not cover all cases perfectly.
// A more robust solution would use a library like `timezone-iana` or `luxon`.
const getIANATimezoneFromOffset = (offsetSeconds: number): string | undefined => {
    // For simplicity, we'll try to match common offsets. This is not exhaustive.
    // OpenWeatherMap provides offsets. `toLocaleTimeString` prefers IANA names.
    // If no match, client-side formatting will use browser's local timezone or UTC.
    const offsetHours = offsetSeconds / 3600;
    // Example:
    // if (offsetHours === -5) return 'America/New_York'; // EST
    // if (offsetHours === 1) return 'Europe/Berlin'; // CET
    // This is hard to maintain. For now, we'll pass undefined if we only have an offset,
    // letting `toLocaleTimeString` use system default or explicit UTC.
    return undefined; 
};

export async function getRealtimeWeatherData(location: string): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    console.error("Weather API key is missing (WEATHER_API_KEY not found in .env or .env.local).");
    throw new Error("Weather API key is not configured. Please add WEATHER_API_KEY to your .env.local file.");
  }

  try {
    // 1. Geocode location
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

    // 2. Fetch Current Weather Data
    const currentResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    if (!currentResponse.ok) {
      const errorData = await currentResponse.json();
      console.error("Current Weather API error:", errorData);
      throw new Error(`Failed to fetch current weather data: ${errorData.message || currentResponse.statusText}`);
    }
    const owmCurrentData = await currentResponse.json() as OWMCurrentWeatherAPIResponse;
    const cityTimezoneOffsetSeconds = owmCurrentData.timezone; // UTC offset in seconds

    // 3. Fetch 5-day/3-hour Forecast Data
    const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    if (!forecastResponse.ok) {
      const errorData = await forecastResponse.json();
      console.error("Forecast API error:", errorData);
      throw new Error(`Failed to fetch forecast data: ${errorData.message || forecastResponse.statusText}`);
    }
    const owmForecastData = await forecastResponse.json() as OWMForecastAPIResponse;

    // 4. Fetch AQI data
    const aqiResponse = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    let owmAqiData: OWMAirPollutionData | null = null;
    if (aqiResponse.ok) {
      const aqiResult = await aqiResponse.json() as OWMAirPollutionResponse;
      if (aqiResult.list && aqiResult.list.length > 0) {
        owmAqiData = aqiResult.list[0];
      }
    } else {
      console.warn("Failed to fetch AQI data:", await aqiResponse.text());
    }
    
    // Attempt to get an IANA timezone for formatting. Fallback to undefined.
    const ianaTimezone = getIANATimezoneFromOffset(cityTimezoneOffsetSeconds);


    // 5. Transform data
    const current: CurrentWeatherData = {
      locationName: location.startsWith("coords:") ? displayLocationName : location,
      temperature: Math.round(owmCurrentData.main.temp),
      humidity: owmCurrentData.main.humidity,
      description: owmCurrentData.weather[0]?.description || 'N/A',
      icon: mapOwmIconToAppIcon(owmCurrentData.weather[0]?.icon),
      windSpeed: Math.round(owmCurrentData.wind.speed * 3.6), // m/s to km/h
      feelsLike: Math.round(owmCurrentData.main.feels_like),
      timestamp: owmCurrentData.dt,
    };

    // Process 5-day forecast data
    const dailyForecasts: { [dateStr: string]: OWMForecastListItem[] } = {};
    owmForecastData.list.forEach(item => {
      // Use dt_txt for date grouping as it's consistently present
      // Convert dt (UTC timestamp) to local date string for grouping
      const date = new Date(item.dt * 1000).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); // YYYY-MM-DD format for reliable keys
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = [];
      }
      dailyForecasts[date].push(item);
    });
    
    const forecast: ForecastDayData[] = Object.keys(dailyForecasts).slice(0, 5).map(dateStr => { // Limit to 5 days
      const dayItems = dailyForecasts[dateStr];
      let temp_min = dayItems[0].main.temp_min;
      let temp_max = dayItems[0].main.temp_max;
      dayItems.forEach(item => {
        if (item.main.temp_min < temp_min) temp_min = item.main.temp_min;
        if (item.main.temp_max > temp_max) temp_max = item.main.temp_max;
      });

      // Choose a representative item for icon/description (e.g., midday or first item)
      const representativeItem = dayItems.find(item => new Date(item.dt * 1000).getUTCHours() >= 12) || dayItems[0];
      
      const dailyHourlyForecast: HourlyForecastData[] = dayItems.map(item => ({
        time: new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: ianaTimezone || 'UTC' }).replace(':00 ',' '), // Display in location's time if IANA known, else UTC
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
      }));

      // For daily AQI, we use the general current AQI as the free forecast API doesn't provide daily AQI.
      // A more advanced solution might use historical AQI averages or a separate AQI forecast API if available.
      const dayAqiData = owmAqiData ? transformOwAqiData(owmAqiData, representativeItem.dt, ianaTimezone) : undefined;


      return {
        date: new Date(representativeItem.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: ianaTimezone || 'UTC' }),
        temp_high: Math.round(temp_max),
        temp_low: Math.round(temp_min),
        description: representativeItem.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(representativeItem.weather[0]?.icon),
        aqi: dayAqiData,
        hourlyForecast: dailyHourlyForecast,
      };
    });

    const generalAqi = owmAqiData ? transformOwAqiData(owmAqiData, owmCurrentData.dt, ianaTimezone) : undefined;
    
    // General hourly forecast for the current/next few hours (from the 5-day forecast list)
    const generalHourlyForecast: HourlyForecastData[] = owmForecastData.list.slice(0, 8).map(item => ({ // Take first 8 available 3-hour slots (24 hours)
        time: new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: ianaTimezone || 'UTC' }).replace(':00 ',' '),
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
    }));


    return {
      current,
      forecast, // This will now be a 5-day forecast
      aqi: generalAqi,
      hourlyForecast: generalHourlyForecast,
      // Add timezone to WeatherData so WeatherDisplay can pass it to CurrentWeather
      // This will be the IANA timezone if resolved, otherwise undefined.
      // This allows CurrentWeather to attempt more accurate 'last updated' time formatting.
      timeZone: ianaTimezone 
    };

  } catch (error) {
    console.error("Error in getRealtimeWeatherData:", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch weather: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching weather data.");
  }
}

function transformOwAqiData(owmAqiData: OWMAirPollutionData, dt: number, timezone?: string): AQIData {
    // The OWM AQI scale is 1 (Good) to 5 (Very Poor).
    // We can scale this to a 0-500 range, but simple categories are often clearer.
    // For 'value', using a direct mapping or small multiplier for visual representation if desired.
    // The value field in AQIData isn't strictly defined to be 0-500 US AQI, it's just a number.
    // Keeping the previous random scaling for now as it's just for display.
    const scaledAqiValue = owmAqiData.main.aqi * 20 + Math.floor(Math.random() * 19);

    return {
        value: scaledAqiValue, // Example: using the OWM 1-5 value or a scaled one
        category: getAQICategoryFromOWM(owmAqiData.main.aqi),
        dominantPollutant: owmAqiData.main.aqi > 2 ? ['PM2.5', 'O3', 'NO2'][owmAqiData.main.aqi - 3] || 'PM2.5' : undefined, // Example dominant pollutant logic
        pollutants: [
          { name: "PM2.5", value: parseFloat(owmAqiData.components.pm2_5.toFixed(1)), unit: "µg/m³" },
          { name: "PM10", value: parseFloat(owmAqiData.components.pm10.toFixed(1)), unit: "µg/m³" },
          { name: "O3", value: parseFloat(owmAqiData.components.o3.toFixed(1)), unit: "µg/m³" },
          { name: "NO2", value: parseFloat(owmAqiData.components.no2.toFixed(1)), unit: "µg/m³" },
          { name: "SO2", value: parseFloat(owmAqiData.components.so2.toFixed(1)), unit: "µg/m³" },
          { name: "CO", value: parseFloat((owmAqiData.components.co / 1000).toFixed(1)), unit: "mg/m³" }, // OWM gives µg/m³, converting to mg/m³
        ].filter(p => p.value > 0 || p.value === 0), // show if value is 0
      };
}
    
