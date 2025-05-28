
// src/app/actions/weatherActions.ts
'use server';

import type { WeatherDataCore, CurrentWeatherData, ForecastDayData, AQIData, HourlyForecastData, AIWeatherScene, WeatherDataResult } from '@/types/weather';
import { generateWeatherScene } from '@/ai/flows/generate-weather-scene';

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
  name: string;
  cod: number;
}

// For /data/2.5/forecast (5 day / 3 hour forecast)
interface OWMForecastListItem {
  dt: number;
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
  pop: number;
  sys: { pod: 'd' | 'n' };
  dt_txt: string;
}

interface OWMCity {
  id: number;
  name: string;
  coord: { lat: number; lon: number };
  country: string;
  population: number;
  timezone: number;
  sunrise: number;
  sunset: number;
}

interface OWMForecastAPIResponse {
  cod: string;
  message: number | string;
  cnt: number;
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
    aqi: number;
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
    '04d': 'Cloud',
    '04n': 'Cloud',
    '09d': 'CloudRain',
    '09n': 'CloudRain',
    '10d': 'CloudDrizzle',
    '10n': 'CloudDrizzle',
    '11d': 'CloudLightning',
    '11n': 'CloudLightning',
    '13d': 'CloudSnow',
    '13n': 'CloudSnow',
    '50d': 'CloudFog',
    '50n': 'CloudFog',
  };
  return mapping[owmIcon] || 'Sun';
};

const getAQICategoryFromOWM = (aqiValue: number): string => {
  if (aqiValue === 1) return "Good";
  if (aqiValue === 2) return "Fair";
  if (aqiValue === 3) return "Moderate";
  if (aqiValue === 4) return "Unhealthy"; // OWM 'Poor'
  if (aqiValue === 5) return "Very Unhealthy"; // OWM 'Very Poor'
  return "Unknown";
};

const getDeterministicAQIScaledValue = (owmAqi: number): number => {
    switch (owmAqi) {
        case 1: return 25;  // Good
        case 2: return 75;  // Fair
        case 3: return 125; // Moderate
        case 4: return 175; // Poor (Unhealthy)
        case 5: return 250; // Very Poor (Very Unhealthy)
        default: return 0;  // Unknown
    }
};


const getIANATimezoneFromOffset = (offsetSeconds: number): string | undefined => {
    // This is a complex mapping; for now, we'll return undefined.
    // A library like `timezone-iana` or a more comprehensive mapping would be needed for full support.
    // For OpenWeatherMap /data/2.5/weather and /data/2.5/forecast, they provide a 'timezone' field
    // which is the shift in seconds from UTC.
    // The `toLocaleTimeString` and `toLocaleDateString` can handle UTC offsets if no IANA tz is provided,
    // or operate in the user's local timezone if 'UTC' is specified as the `timeZone` option.
    return undefined;
};

async function safeFetch(url: string, resourceName: string): Promise<any> {
  const response = await fetch(url);
  const responseText = await response.text(); // Read as text first
  if (!response.ok) {
    let errorDetails = `Failed to fetch ${resourceName}: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(responseText); // Try to parse as JSON
      errorDetails = errorJson.message || errorJson.error || errorJson.error_message || errorDetails;
    } catch (e) {
      // If parsing as JSON fails, it might be an HTML error page or plain text
      errorDetails += ` - Response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`;
    }
    console.error(`${resourceName} API error:`, errorDetails);
    // Throw a more specific error message if it's a known OWM error
    if (errorDetails.includes("Invalid API key")) {
        throw new Error("Invalid API key. Please check your WEATHER_API_KEY.");
    }
    if (errorDetails.includes("calls per minute") || errorDetails.includes("rate limit")) {
        throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Failed to fetch ${resourceName}: ${errorDetails}`);
  }
  try {
    return JSON.parse(responseText); // Parse as JSON if response.ok
  } catch (e) {
    console.error(`Failed to parse JSON from ${resourceName}:`, responseText);
    throw new Error(`Failed to parse JSON response from ${resourceName}.`);
  }
}


export async function getRealtimeWeatherData(location: string): Promise<WeatherDataResult> {
  const owmApiKey = process.env.WEATHER_API_KEY;

  if (!owmApiKey) {
    const errMsg = "OpenWeatherMap API key is not configured. Please add WEATHER_API_KEY to your .env.local file.";
    console.error(errMsg);
    return { success: false, error: errMsg };
  }

  try {
    let lat: number;
    let lon: number;
    let displayLocationName: string;
    let cityTimezoneOffsetSeconds: number;

    if (location.startsWith('coords:')) {
      const parts = location.substring(7).split(',');
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        return { success: false, error: 'Invalid coordinates format. Expected "coords:lat,lon".' };
      }
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);

      const reverseGeoDataArr = await safeFetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${owmApiKey}`,
        'OpenWeatherMap reverse geocoding'
      ) as OWMGeocodingResponse[];
      if (reverseGeoDataArr && reverseGeoDataArr.length > 0) {
        const { name: rgName, country: rgCountry, state: rgState } = reverseGeoDataArr[0];
        displayLocationName = rgState ? `${rgName}, ${rgState}, ${rgCountry}` : `${rgName}, ${rgCountry}`;
      } else {
        displayLocationName = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
      }
    } else {
      const owmGeoDataArr = await safeFetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${owmApiKey}`,
        'OpenWeatherMap direct geocoding'
      ) as OWMGeocodingResponse[];

      if (!owmGeoDataArr || owmGeoDataArr.length === 0) {
        return { success: false, error: 'Location not found. Please try a different search term.' };
      }
      const { lat: geoLat, lon: geoLon, name: bestMatchLocationName, country, state } = owmGeoDataArr[0];
      lat = geoLat;
      lon = geoLon;
      displayLocationName = state ? `${bestMatchLocationName}, ${state}, ${country}` : `${bestMatchLocationName}, ${country}`;
    }

    const owmCurrentData = await safeFetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${owmApiKey}&units=metric`,
      'current weather'
    ) as OWMCurrentWeatherAPIResponse;
    cityTimezoneOffsetSeconds = owmCurrentData.timezone;

    const owmForecastData = await safeFetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${owmApiKey}&units=metric`,
      'forecast'
    ) as OWMForecastAPIResponse;
    // Use forecast's timezone if available, as it might be more accurate for the forecast period
    cityTimezoneOffsetSeconds = owmForecastData.city.timezone || cityTimezoneOffsetSeconds;


    let owmAqiData: OWMAirPollutionData | null = null;
    try {
        const aqiResult = await safeFetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${owmApiKey}`,
            'AQI'
        ) as OWMAirPollutionResponse;
        if (aqiResult.list && aqiResult.list.length > 0) {
            owmAqiData = aqiResult.list[0];
        }
    } catch (aqiError) {
        console.warn("Could not fetch AQI data, proceeding without it:", (aqiError as Error).message);
        // Do not return error here, proceed without AQI
    }

    const ianaTimezone = getIANATimezoneFromOffset(cityTimezoneOffsetSeconds);

    const current: CurrentWeatherData = {
      locationName: displayLocationName,
      temperature: Math.round(owmCurrentData.main.temp),
      humidity: owmCurrentData.main.humidity,
      description: owmCurrentData.weather[0]?.description || 'N/A',
      icon: mapOwmIconToAppIcon(owmCurrentData.weather[0]?.icon),
      windSpeed: Math.round(owmCurrentData.wind.speed * 3.6), // m/s to km/h
      feelsLike: Math.round(owmCurrentData.main.feels_like),
      timestamp: owmCurrentData.dt,
    };

    const dailyForecasts: { [dateStr: string]: OWMForecastListItem[] } = {};
    owmForecastData.list.forEach(item => {
      const itemDate = new Date(item.dt * 1000);
      const localItemDate = new Date(itemDate.getTime() + cityTimezoneOffsetSeconds * 1000); // Adjust to city's local time for grouping
      const dateStr = localItemDate.toISOString().split('T')[0];

      if (!dailyForecasts[dateStr]) {
        dailyForecasts[dateStr] = [];
      }
      dailyForecasts[dateStr].push(item);
    });

    const forecast: ForecastDayData[] = Object.keys(dailyForecasts).slice(0, 5).map(dateStr => {
      const dayItems = dailyForecasts[dateStr];
      let temp_min = dayItems[0].main.temp_min;
      let temp_max = dayItems[0].main.temp_max;
      dayItems.forEach(item => {
        if (item.main.temp_min < temp_min) temp_min = item.main.temp_min;
        if (item.main.temp_max > temp_max) temp_max = item.main.temp_max;
      });

      // Find a representative item for the day (e.g., around noon or afternoon)
      // Or use the item with the most common weather, or simply the middle one.
      const representativeItem = dayItems.find(item => {
        const hour = new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).getUTCHours(); // Compare in UTC hours after offset
        return hour >= 12 && hour < 18; // Look for items between 12 PM and 6 PM local time
      }) || dayItems[Math.floor(dayItems.length / 2)] || dayItems[0]; // Fallbacks

      const dailyHourlyForecast: HourlyForecastData[] = dayItems.map(item => ({
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''),
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
      }));
      
      // For daily AQI, we'll use the general AQI as OWM doesn't provide daily forecast AQI easily
      // Or, one could try to find an AQI reading close to this day if the air_pollution/forecast endpoint was used.
      // For simplicity with current API, we use the current general AQI for all forecast days or make it undefined.
      // The OWM /air_pollution endpoint gives current and a short forecast, not per-day for 5 days.
      // So, we'll use the overall current AQI for each day's display, or leave it out.
      // For now, let's assume if we have generalAqi, we can show it for each day if desired,
      // but it might be misleading. So, we make it optional and potentially undefined for forecast days.
      const dayAqiData = owmAqiData ? transformOwAqiData(owmAqiData, representativeItem.dt, cityTimezoneOffsetSeconds) : undefined; // Potentially re-use general AQI or fetch specific if API allows
      const forecastDate = new Date(representativeItem.dt * 1000 + cityTimezoneOffsetSeconds * 1000);


      return {
        date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
        temp_high: Math.round(temp_max),
        temp_low: Math.round(temp_min),
        description: representativeItem.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(representativeItem.weather[0]?.icon),
        aqi: dayAqiData, // This will be the general AQI, repeated.
        hourlyForecast: dailyHourlyForecast,
      };
    });

    const generalAqi = owmAqiData ? transformOwAqiData(owmAqiData, owmCurrentData.dt, cityTimezoneOffsetSeconds) : undefined;
    
    // General hourly forecast for the next ~24 hours from the start of the forecast list
    const generalHourlyForecast: HourlyForecastData[] = owmForecastData.list.slice(0, 8).map(item => ({ // Typically 8 items for 24 hours (3-hour intervals)
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute:'2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''),
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
    }));

    let aiSceneData: AIWeatherScene | undefined = undefined;
    try {
      aiSceneData = await generateWeatherScene({
        locationName: displayLocationName,
        weatherDescription: current.description,
        temperature: current.temperature,
      });
    } catch (sceneError) {
      console.warn("AI scene generation failed:", (sceneError as Error).message);
      // Default to unavailable if generation fails
      aiSceneData = {
        imageUri: '',
        prompt: '',
        reliability: 'Unavailable',
        modelUsed: 'googleai/gemini-2.0-flash-exp' // or undefined
      };
    }
    
    const weatherDataCore: WeatherDataCore = {
      current,
      forecast,
      aqi: generalAqi,
      hourlyForecast: generalHourlyForecast,
      timeZone: ianaTimezone, // This might be undefined, client should handle
      resolvedLat: lat,
      resolvedLon: lon,
      aiScene: aiSceneData,
    };
    return { success: true, data: weatherDataCore };

  } catch (error) {
    console.error("Error in getRealtimeWeatherData:", error);
    if (error instanceof Error) {
      // Specific operational errors should be returned in the error property
      if (error.message.startsWith("Failed to geocode location:") ||
          error.message.startsWith("Location not found") ||
          error.message.startsWith("Invalid API key") ||
          error.message.startsWith("API rate limit exceeded") ||
          error.message.includes("requires a separate subscription") || // Though we moved away from OneCall 3.0
          error.message.startsWith("Invalid coordinates format") ||
          error.message.startsWith("Failed to fetch")) { // Generic fetch failure from safeFetch
        return { success: false, error: error.message };
      }
      // For other errors, provide a generic message
      return { success: false, error: `Could not fetch weather data. Please try again later. Details: ${error.message}` };
    }
    return { success: false, error: "An unknown error occurred while fetching weather data." };
  }
}

function transformOwAqiData(owmAqiData: OWMAirPollutionData, dt: number, timezoneOffsetSeconds: number): AQIData {
    const scaledAqiValue = getDeterministicAQIScaledValue(owmAqiData.main.aqi);
    let dominantPollutant: string | undefined = undefined;

    if (owmAqiData.main.aqi > 2) { // Only try to determine for Moderate or worse
        const components = owmAqiData.components;
        // These thresholds are indicative and might need adjustment based on specific AQI calculation standards
        // Simplified for demonstration. Real standards (e.g., EPA breakpoints) are more complex.
        const pollutantLevels = [
            { name: "PM2.5", value: components.pm2_5, threshold: 35.4 }, // Cutoff for Moderate for PM2.5 (µg/m³)
            { name: "PM10", value: components.pm10, threshold: 154 },  // Cutoff for Moderate for PM10 (µg/m³)
            { name: "O3", value: components.o3, threshold: 100 },    // Ozone (µg/m³). Note: OWM gives µg/m³, standard often in ppb. Conversion needed for strict standard. Assuming µg/m³ here.
            { name: "NO2", value: components.no2, threshold: 100 },   // NO2 (µg/m³)
            { name: "SO2", value: components.so2, threshold: 75 },    // SO2 (µg/m³)
            { name: "CO", value: components.co, threshold: 9000 } // CO (µg/m³). EPA standard often in ppm (e.g. 9 ppm). 1 ppm CO ~ 1145 µg/m³. So 9ppm ~ 10305 µg/m³. Using a µg/m³ threshold.
        ];

        let maxPollutantRatio = 0;
        let potentialDominant: string | undefined = undefined;

        for (const p of pollutantLevels) {
            if (p.value > 0 && p.threshold > 0) {
                const ratio = p.value / p.threshold;
                // Pollutant must be above its threshold AND contribute most significantly relative to its threshold
                if (ratio > maxPollutantRatio && ratio > 1) {
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
          { name: "PM2.5", value: parseFloat(owmAqiData.components.pm2_5.toFixed(1)), unit: "µg/m³" },
          { name: "PM10", value: parseFloat(owmAqiData.components.pm10.toFixed(1)), unit: "µg/m³" },
          { name: "O3", value: parseFloat(owmAqiData.components.o3.toFixed(1)), unit: "µg/m³" },
          { name: "NO2", value: parseFloat(owmAqiData.components.no2.toFixed(1)), unit: "µg/m³" },
          { name: "SO2", value: parseFloat(owmAqiData.components.so2.toFixed(1)), unit: "µg/m³" },
          // OWM CO is in µg/m³. To display in mg/m³ (more common for CO), divide by 1000.
          { name: "CO", value: parseFloat((owmAqiData.components.co / 1000).toFixed(1)), unit: "mg/m³" },
        ].filter(p => p.value > 0 || p.value === 0), // Keep pollutants with 0 value if reported by API
      };
}
