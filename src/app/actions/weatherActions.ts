
// src/app/actions/weatherActions.ts
'use server';

import type { WeatherData, CurrentWeatherData, ForecastDayData, AQIData, HourlyForecastData, AIWeatherScene } from '@/types/weather';
import { generateWeatherScene, type GenerateWeatherSceneInput } from '@/ai/flows/generate-weather-scene';


// --- Interfaces for OpenWeatherMap API responses (standard APIs) ---
interface OWMGeocodingResponse {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  local_names?: { [key: string]: string };
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
  name: string; // City name (from OWM, might be different from user input or reverse geocoded)
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
    '04d': 'Cloud', // Often used for broken clouds by OWM
    '04n': 'Cloud', // Often used for broken clouds by OWM
    '09d': 'CloudRain', // Shower rain
    '09n': 'CloudRain', // Shower rain
    '10d': 'CloudDrizzle', // Rain
    '10n': 'CloudDrizzle', // Rain
    '11d': 'CloudLightning', // Thunderstorm
    '11n': 'CloudLightning', // Thunderstorm
    '13d': 'CloudSnow', // Snow
    '13n': 'CloudSnow', // Snow
    '50d': 'CloudFog', // Mist/Fog
    '50n': 'CloudFog', // Mist/Fog
  };
  return mapping[owmIcon] || 'Sun'; // Default to Sun if unknown
};

const getAQICategoryFromOWM = (aqiValue: number): string => {
  if (aqiValue === 1) return "Good";
  if (aqiValue === 2) return "Fair";
  if (aqiValue === 3) return "Moderate";
  // OpenWeatherMap uses "Poor" and "Very Poor". We'll map them to more common terms.
  if (aqiValue === 4) return "Unhealthy"; // OWM "Poor"
  if (aqiValue === 5) return "Very Unhealthy"; // OWM "Very Poor"
  return "Unknown";
};

const getDeterministicAQIScaledValue = (owmAqi: number): number => {
    // Maps OWM's 1-5 scale to a more common 0-300+ representative value
    // These are approximate mid-points for typical AQI categories.
    switch (owmAqi) {
        case 1: return 25;  // Good (0-50)
        case 2: return 75;  // Fair/Moderate (51-100)
        case 3: return 125; // Moderate/Unhealthy for Sensitive (101-150)
        case 4: return 175; // Unhealthy (151-200)
        case 5: return 250; // Very Unhealthy (201-300)
        default: return 0;  // Unknown
    }
};


const getIANATimezoneFromOffset = (offsetSeconds: number): string | undefined => {
    // This is a simplified lookup. A robust solution needs a library like `timezone-lookup`.
    // For now, we'll rely on client's local time for formatting or clearly label as UTC.
    // OWM's `timezone` field in current weather response is offset in seconds from UTC.
    // One Call API 3.0 used to provide an IANA timezone directly.
    // Since we switched, this is less straightforward.
    // For demonstration, we can return a fixed offset string, but it's not IANA.
    // Example: `Etc/GMT${offsetSeconds >= 0 ? '-' : '+'}${Math.abs(offsetSeconds / 3600)}`
    // However, it's better to just pass undefined and let date formatting handle it based on UTC timestamps.
    return undefined;
};

async function safeFetch(url: string, resourceName: string): Promise<any> {
  const response = await fetch(url);
  const responseText = await response.text(); // Read as text first
  if (!response.ok) {
    let errorDetails = `Failed to fetch ${resourceName}: ${response.status} ${response.statusText}`;
    try {
      // Attempt to parse as JSON, as OWM often returns JSON errors
      const errorJson = JSON.parse(responseText);
      errorDetails = errorJson.message || errorJson.error || errorDetails;
    } catch (e) {
      // If parsing as JSON fails, it might be an HTML error page or plain text
      errorDetails += ` - Response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`;
    }
    console.error(`${resourceName} API error:`, errorDetails);
    throw new Error(`Failed to fetch ${resourceName}: ${errorDetails}`);
  }
  try {
    return JSON.parse(responseText); // Now parse as JSON since response.ok was true
  } catch (e) {
    console.error(`Failed to parse JSON from ${resourceName}:`, responseText);
    throw new Error(`Failed to parse JSON response from ${resourceName}.`);
  }
}


export async function getRealtimeWeatherData(location: string): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    console.error("Weather API key is missing (WEATHER_API_KEY not found in .env or .env.local).");
    throw new Error("Weather API key is not configured. Please add WEATHER_API_KEY to your .env.local file.");
  }

  try {
    let lat: number;
    let lon: number;
    let displayLocationName: string;
    let cityTimezoneOffsetSeconds: number; // In seconds from UTC

    // Check if location is coordinates
    if (location.startsWith('coords:')) {
      const parts = location.substring(7).split(',');
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        throw new Error('Invalid coordinates format. Expected "coords:lat,lon".');
      }
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);

      // Reverse geocode to get a display name
      const reverseGeoDataArr = await safeFetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`, 'reverse geocoding') as OWMGeocodingResponse[];
      if (reverseGeoDataArr && reverseGeoDataArr.length > 0) {
        const { name: rgName, country: rgCountry, state: rgState } = reverseGeoDataArr[0];
        displayLocationName = rgState ? `${rgName}, ${rgState}, ${rgCountry}` : `${rgName}, ${rgCountry}`;
      } else {
        displayLocationName = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`; // Fallback display name
      }
    } else {
      // Geocode location string to lat/lon
      const geoDataArr = await safeFetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`, 'geocoding') as OWMGeocodingResponse[];
      if (!geoDataArr || geoDataArr.length === 0) {
        throw new Error('Location not found. Please try a different search term.');
      }
      const { lat: geoLat, lon: geoLon, name: bestMatchLocationName, country, state } = geoDataArr[0];
      lat = geoLat;
      lon = geoLon;
      displayLocationName = state ? `${bestMatchLocationName}, ${state}, ${country}` : `${bestMatchLocationName}, ${country}`;
    }

    // Fetch current weather using /data/2.5/weather
    const owmCurrentData = await safeFetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`, 'current weather') as OWMCurrentWeatherAPIResponse;
    cityTimezoneOffsetSeconds = owmCurrentData.timezone; // Get timezone offset from current weather

    // Fetch 5-day/3-hour forecast using /data/2.5/forecast
    const owmForecastData = await safeFetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`, 'forecast') as OWMForecastAPIResponse;
    // Update timezone offset if forecast data provides a more specific one (though usually consistent for a city)
    cityTimezoneOffsetSeconds = owmForecastData.city.timezone || cityTimezoneOffsetSeconds;

    // Fetch Air Quality Index (AQI)
    let owmAqiData: OWMAirPollutionData | null = null;
    try {
        const aqiResult = await safeFetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`, 'AQI') as OWMAirPollutionResponse;
        if (aqiResult.list && aqiResult.list.length > 0) {
            owmAqiData = aqiResult.list[0]; // Use the first (current) AQI data point
        }
    } catch (aqiError) {
        console.warn("Could not fetch AQI data, proceeding without it:", (aqiError as Error).message);
        // AQI is optional, so we don't re-throw the error here.
    }
    
    const ianaTimezone = getIANATimezoneFromOffset(cityTimezoneOffsetSeconds); // May return undefined

    const current: CurrentWeatherData = {
      locationName: displayLocationName,
      temperature: Math.round(owmCurrentData.main.temp),
      humidity: owmCurrentData.main.humidity,
      description: owmCurrentData.weather[0]?.description || 'N/A',
      icon: mapOwmIconToAppIcon(owmCurrentData.weather[0]?.icon),
      windSpeed: Math.round(owmCurrentData.wind.speed * 3.6), // m/s to km/h
      feelsLike: Math.round(owmCurrentData.main.feels_like),
      timestamp: owmCurrentData.dt, // Unix UTC timestamp
    };

    // Process 5-day forecast
    // Group forecast items by local date considering the city's timezone offset
    const dailyForecasts: { [dateStr: string]: OWMForecastListItem[] } = {};
    owmForecastData.list.forEach(item => {
      const itemDate = new Date(item.dt * 1000); // This is UTC
      // Adjust to local time of the city for grouping by date
      const localItemDate = new Date(itemDate.getTime() + cityTimezoneOffsetSeconds * 1000);
      const dateStr = localItemDate.toISOString().split('T')[0]; // YYYY-MM-DD in city's local time

      if (!dailyForecasts[dateStr]) {
        dailyForecasts[dateStr] = [];
      }
      dailyForecasts[dateStr].push(item);
    });

    const forecast: ForecastDayData[] = Object.keys(dailyForecasts).slice(0, 5).map(dateStr => { // Limit to 5 days
      const dayItems = dailyForecasts[dateStr];
      let temp_min = dayItems[0].main.temp_min;
      let temp_max = dayItems[0].main.temp_max;
      dayItems.forEach(item => {
        if (item.main.temp_min < temp_min) temp_min = item.main.temp_min;
        if (item.main.temp_max > temp_max) temp_max = item.main.temp_max;
      });

      // Find a representative item for the day's weather description/icon (e.g., midday)
      const representativeItem = dayItems.find(item => {
        const hour = new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).getUTCHours(); // Hour in city's local time
        return hour >= 12 && hour < 18; // Prefer afternoon
      }) || dayItems[Math.floor(dayItems.length / 2)] || dayItems[0]; // Fallback

      const dailyHourlyForecast: HourlyForecastData[] = dayItems.map(item => ({
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''), // Format as local time of city
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
      }));

      // For daily AQI, we use the general AQI if available as OWM's free tier doesn't provide daily forecast AQI
      const dayAqiData = owmAqiData ? transformOwAqiData(owmAqiData, representativeItem.dt, cityTimezoneOffsetSeconds) : undefined;
      const forecastDate = new Date(representativeItem.dt * 1000 + cityTimezoneOffsetSeconds * 1000);

      return {
        date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }), // Display date in city's local time
        temp_high: Math.round(temp_max),
        temp_low: Math.round(temp_min),
        description: representativeItem.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(representativeItem.weather[0]?.icon),
        aqi: dayAqiData, // Use general current AQI for all forecast days as a simplification
        hourlyForecast: dailyHourlyForecast,
      };
    });

    // General AQI for the current time
    const generalAqi = owmAqiData ? transformOwAqiData(owmAqiData, owmCurrentData.dt, cityTimezoneOffsetSeconds) : undefined;

    // General hourly forecast for the next ~24 hours (8 * 3-hour intervals)
    const generalHourlyForecast: HourlyForecastData[] = owmForecastData.list.slice(0, 8).map(item => ({
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute:'2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''),
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
    }));

    // AI Scene Generation
    let aiSceneData: AIWeatherScene | null = null;
    try {
      const aiSceneInput: GenerateWeatherSceneInput = {
        location: displayLocationName.split(',')[0], // Use just the city name for better image results
        description: current.description,
      };
      aiSceneData = await generateWeatherScene(aiSceneInput);
    } catch (sceneError) {
      console.warn("AI scene generation failed:", (sceneError as Error).message);
      aiSceneData = { imageUri: null, reliability: "AI scene generation unavailable." };
    }


    return {
      current,
      forecast,
      aqi: generalAqi,
      hourlyForecast: generalHourlyForecast,
      timeZone: ianaTimezone, // This might be undefined
      resolvedLat: lat,
      resolvedLon: lon,
      aiScene: aiSceneData,
    };

  } catch (error) {
    console.error("Error in getRealtimeWeatherData:", error);
    if (error instanceof Error) {
      // Propagate specific, user-friendly messages for common issues
      if (error.message.startsWith("Failed to geocode location:") || 
          error.message.startsWith("Location not found") ||
          error.message.startsWith("Failed to fetch current weather data:") ||
          error.message.startsWith("Failed to fetch forecast data:") ||
          error.message.startsWith("Failed to fetch AQI data:") ||
          error.message.startsWith("Invalid API key") || // Check for invalid API key messages
          error.message.includes("requires a separate subscription") || // Check for subscription issues
          error.message.startsWith("Invalid coordinates format") ||
          error.message.startsWith("Failed to fetch")) { // Generic fetch error from safeFetch
        throw new Error(error.message); // Re-throw the specific error from safeFetch or geocoding
      }
      // For other errors, provide a more generic message
      throw new Error(`Could not fetch weather data. Please try again later.`);
    }
    throw new Error("An unknown error occurred while fetching weather data.");
  }
}

function transformOwAqiData(owmAqiData: OWMAirPollutionData, dt: number, timezoneOffsetSeconds: number): AQIData {
    const scaledAqiValue = getDeterministicAQIScaledValue(owmAqiData.main.aqi);

    // Determine dominant pollutant if AQI is not "Good" or "Fair"
    let dominantPollutant: string | undefined = undefined;
    if (owmAqiData.main.aqi > 2) { // Corresponds to Moderate or worse
        const components = owmAqiData.components;
        // Simplified dominant pollutant logic: find the one with highest concentration relative to a rough "significance" threshold
        // This is not a standard calculation but a heuristic for display.
        // Thresholds are very approximate and may need adjustment.
        const pollutantLevels = [
            { name: "PM2.5", value: components.pm2_5, threshold: 35 }, // WHO guideline for 24h mean
            { name: "O3", value: components.o3, threshold: 100 },    // WHO guideline for 8h mean
            { name: "NO2", value: components.no2, threshold: 100 },   // WHO guideline for 1h mean (higher than annual)
            { name: "PM10", value: components.pm10, threshold: 50 },   // WHO guideline for 24h mean
            { name: "SO2", value: components.so2, threshold: 75 },    // Arbitrary, less common dominant
            { name: "CO", value: components.co / 1000, threshold: 9 } // Convert to mg/m³, WHO guideline for 8h mean
        ];

        let maxPollutantRatio = 0;
        let potentialDominant: string | undefined = undefined;

        for (const p of pollutantLevels) {
            if (p.value > 0 && p.threshold > 0) { // Ensure value and threshold are positive
                const ratio = p.value / p.threshold;
                if (ratio > maxPollutantRatio && ratio > 1) { // Must be significantly above its threshold
                    maxPollutantRatio = ratio;
                    potentialDominant = p.name;
                }
            }
        }
        dominantPollutant = potentialDominant;
    }

    return {
        value: scaledAqiValue,
        category: getAQICategoryFromOWM(owmAqiData.main.aqi),
        dominantPollutant: dominantPollutant,
        pollutants: [
          // Ensure values are numbers and units are consistent
          { name: "PM2.5", value: parseFloat(owmAqiData.components.pm2_5.toFixed(1)), unit: "µg/m³" },
          { name: "PM10", value: parseFloat(owmAqiData.components.pm10.toFixed(1)), unit: "µg/m³" },
          { name: "O3", value: parseFloat(owmAqiData.components.o3.toFixed(1)), unit: "µg/m³" },
          { name: "NO2", value: parseFloat(owmAqiData.components.no2.toFixed(1)), unit: "µg/m³" },
          { name: "SO2", value: parseFloat(owmAqiData.components.so2.toFixed(1)), unit: "µg/m³" },
          { name: "CO", value: parseFloat((owmAqiData.components.co / 1000).toFixed(1)), unit: "mg/m³" }, // CO is often in mg/m³
        ].filter(p => p.value > 0 || p.value === 0), // Keep pollutants even if value is 0, to show they are tracked
      };
}

