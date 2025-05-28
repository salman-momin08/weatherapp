
// src/app/actions/weatherActions.ts
'use server';

import type { WeatherData, CurrentWeatherData, ForecastDayData, AQIData, HourlyForecastData, AIWeatherScene } from '@/types/weather';
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
  if (aqiValue === 4) return "Unhealthy"; 
  if (aqiValue === 5) return "Very Unhealthy"; 
  return "Unknown";
};

const getDeterministicAQIScaledValue = (owmAqi: number): number => {
    switch (owmAqi) {
        case 1: return 25;  
        case 2: return 75;  
        case 3: return 125; 
        case 4: return 175; 
        case 5: return 250; 
        default: return 0;  
    }
};


const getIANATimezoneFromOffset = (offsetSeconds: number): string | undefined => {
    // This is a very simplified mapping. For production, a comprehensive library is needed.
    const hours = offsetSeconds / 3600;
    // Example: Find a timezone that matches this offset for the current date.
    // This is not robust and just for demonstration if needed.
    // For robust timezone conversion, consider libraries like `timezone-iana` or `luxon`.
    // For OpenWeatherMap's standard APIs, it's often easier to work with their UTC timestamps
    // and let the client's browser handle display in local time, or use the timezone offset
    // for calculations if a specific target timezone is required for display.
    // OpenWeatherMap's OneCall API 3.0 did provide an IANA timezone string directly.
    // For now, returning undefined and relying on client-side or UTC interpretations.
    return undefined;
};

async function safeFetch(url: string, resourceName: string): Promise<any> {
  const response = await fetch(url);
  const responseText = await response.text(); 
  if (!response.ok) {
    let errorDetails = `Failed to fetch ${resourceName}: ${response.status} ${response.statusText}`;
    try {
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
    return JSON.parse(responseText); 
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
    let cityTimezoneOffsetSeconds: number; 

    // Check if location is coordinates
    if (location.startsWith('coords:')) {
      const parts = location.substring(7).split(',');
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        throw new Error('Invalid coordinates format. Expected "coords:lat,lon".');
      }
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);

      // Reverse geocode to get location name
      const reverseGeoDataArr = await safeFetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`, 'reverse geocoding') as OWMGeocodingResponse[];
      if (reverseGeoDataArr && reverseGeoDataArr.length > 0) {
        const { name: rgName, country: rgCountry, state: rgState } = reverseGeoDataArr[0];
        displayLocationName = rgState ? `${rgName}, ${rgState}, ${rgCountry}` : `${rgName}, ${rgCountry}`;
      } else {
        // Fallback display name if reverse geocoding fails
        displayLocationName = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`; 
      }
    } else {
      // Geocode location string
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
    // Use timezone from forecast if more reliable, or fallback to current weather's
    cityTimezoneOffsetSeconds = owmForecastData.city.timezone || cityTimezoneOffsetSeconds;


    // Fetch Air Quality Index data
    let owmAqiData: OWMAirPollutionData | null = null;
    try {
        const aqiResult = await safeFetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`, 'AQI') as OWMAirPollutionResponse;
        if (aqiResult.list && aqiResult.list.length > 0) {
            owmAqiData = aqiResult.list[0]; // Use the first (current) AQI data point
        }
    } catch (aqiError) {
        console.warn("Could not fetch AQI data, proceeding without it:", (aqiError as Error).message);
        // Optionally, you could set a default/error AQI state here
    }
    
    // Convert timezone offset to IANA timezone string if possible (currently a stub)
    const ianaTimezone = getIANATimezoneFromOffset(cityTimezoneOffsetSeconds); 

    // Transform current weather data
    const current: CurrentWeatherData = {
      locationName: displayLocationName,
      temperature: Math.round(owmCurrentData.main.temp),
      humidity: owmCurrentData.main.humidity,
      description: owmCurrentData.weather[0]?.description || 'N/A',
      icon: mapOwmIconToAppIcon(owmCurrentData.weather[0]?.icon),
      windSpeed: Math.round(owmCurrentData.wind.speed * 3.6), // m/s to km/h
      feelsLike: Math.round(owmCurrentData.main.feels_like),
      timestamp: owmCurrentData.dt, // Unix timestamp from API
    };

    // Process forecast data: Group by day
    const dailyForecasts: { [dateStr: string]: OWMForecastListItem[] } = {};
    owmForecastData.list.forEach(item => {
      // Adjust timestamp to local time of the city using its timezone offset
      const itemDate = new Date(item.dt * 1000); // API dt is UTC
      const localItemDate = new Date(itemDate.getTime() + cityTimezoneOffsetSeconds * 1000); // Apply offset
      const dateStr = localItemDate.toISOString().split('T')[0]; // Get YYYY-MM-DD in city's local time

      if (!dailyForecasts[dateStr]) {
        dailyForecasts[dateStr] = [];
      }
      dailyForecasts[dateStr].push(item);
    });

    // Transform daily forecasts
    const forecast: ForecastDayData[] = Object.keys(dailyForecasts).slice(0, 5).map(dateStr => { // Limit to 5 days
      const dayItems = dailyForecasts[dateStr];
      let temp_min = dayItems[0].main.temp_min;
      let temp_max = dayItems[0].main.temp_max;
      dayItems.forEach(item => {
        if (item.main.temp_min < temp_min) temp_min = item.main.temp_min;
        if (item.main.temp_max > temp_max) temp_max = item.main.temp_max;
      });

      // Find a representative item for the day (e.g., midday)
      const representativeItem = dayItems.find(item => {
        const hour = new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).getUTCHours(); // Hour in city's local time
        return hour >= 12 && hour < 18; // Prefer afternoon
      }) || dayItems[Math.floor(dayItems.length / 2)] || dayItems[0]; // Fallbacks

      // Create hourly forecast for this specific day
      const dailyHourlyForecast: HourlyForecastData[] = dayItems.map(item => ({
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''), // Display time based on city's local time
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
      }));

      // Get AQI for this day (using the representative item's timestamp, but AQI is usually daily)
      // Note: OWM's free AQI is current, not forecast. We'll use the current AQI for all forecast days.
      const dayAqiData = owmAqiData ? transformOwAqiData(owmAqiData, representativeItem.dt, cityTimezoneOffsetSeconds) : undefined;
      const forecastDate = new Date(representativeItem.dt * 1000 + cityTimezoneOffsetSeconds * 1000); // Date in city's local time

      return {
        date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }), // Display date based on city's local time
        temp_high: Math.round(temp_max),
        temp_low: Math.round(temp_min),
        description: representativeItem.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(representativeItem.weather[0]?.icon),
        aqi: dayAqiData, 
        hourlyForecast: dailyHourlyForecast,
      };
    });

    // General AQI for the current weather display
    const generalAqi = owmAqiData ? transformOwAqiData(owmAqiData, owmCurrentData.dt, cityTimezoneOffsetSeconds) : undefined;

    // General hourly forecast for the current weather display (next ~24 hours from 3-hour data)
    const generalHourlyForecast: HourlyForecastData[] = owmForecastData.list.slice(0, 8).map(item => ({ // Approx next 24 hours (8 * 3hr intervals)
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute:'2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''),// Display time based on city's local time
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
    }));

    // AI Scene Generation
    let aiSceneData: AIWeatherScene | undefined = undefined;
    try {
      aiSceneData = await generateWeatherScene({
        locationName: displayLocationName,
        weatherDescription: current.description,
        temperature: current.temperature,
      });
    } catch (sceneError) {
      console.warn("AI scene generation failed:", (sceneError as Error).message);
      aiSceneData = {
        imageUri: '',
        prompt: '',
        reliability: 'Unavailable',
        modelUsed: 'googleai/gemini-2.0-flash-exp'
      };
    }


    return {
      current,
      forecast,
      aqi: generalAqi,
      hourlyForecast: generalHourlyForecast,
      timeZone: ianaTimezone, // This might be undefined, client can use browser default or UTC
      resolvedLat: lat,
      resolvedLon: lon,
      aiScene: aiSceneData,
    };

  } catch (error) {
    console.error("Error in getRealtimeWeatherData:", error);
    if (error instanceof Error) {
      // More specific error handling based on common issues
      if (error.message.startsWith("Failed to geocode location:") || 
          error.message.startsWith("Location not found") ||
          error.message.startsWith("Failed to fetch current weather data:") ||
          error.message.startsWith("Failed to fetch forecast data:") ||
          error.message.startsWith("Failed to fetch AQI data:") ||
          error.message.startsWith("Invalid API key") || 
          error.message.includes("requires a separate subscription") || // For OneCall API if accidentally used
          error.message.startsWith("Invalid coordinates format") ||
          error.message.startsWith("Failed to fetch")) { // Generic fetch failure from safeFetch
        throw new Error(error.message); // Re-throw specific operational errors
      }
      // For other errors, provide a generic message
      throw new Error(`Could not fetch weather data. Please try again later.`);
    }
    throw new Error("An unknown error occurred while fetching weather data.");
  }
}

function transformOwAqiData(owmAqiData: OWMAirPollutionData, dt: number, timezoneOffsetSeconds: number): AQIData {
    // Use the deterministic scaling
    const scaledAqiValue = getDeterministicAQIScaledValue(owmAqiData.main.aqi);

    // Determine dominant pollutant if AQI is not "Good" or "Fair"
    let dominantPollutant: string | undefined = undefined;
    if (owmAqiData.main.aqi > 2) { // OWM AQI 3 (Moderate) or higher
        const components = owmAqiData.components;
        // Simplified dominant pollutant logic: Check which common pollutant is highest relative to typical "moderate" thresholds
        // This is a heuristic and not a formal AQI calculation method for dominant pollutant.
        const pollutantLevels = [
            { name: "PM2.5", value: components.pm2_5, threshold: 35 }, // Example threshold for moderate PM2.5
            { name: "O3", value: components.o3, threshold: 100 },    // Example threshold for moderate O3 (ppb)
            { name: "NO2", value: components.no2, threshold: 100 },   // Example threshold for moderate NO2 (ppb)
            { name: "PM10", value: components.pm10, threshold: 50 },   // Example threshold for moderate PM10
            { name: "SO2", value: components.so2, threshold: 75 },    // Example threshold for moderate SO2 (ppb)
            { name: "CO", value: components.co / 1000, threshold: 9 } // CO in mg/m³, example threshold
        ];

        let maxPollutantRatio = 0;
        let potentialDominant: string | undefined = undefined;

        for (const p of pollutantLevels) {
            if (p.value > 0 && p.threshold > 0) { // Ensure value and threshold are positive
                const ratio = p.value / p.threshold;
                if (ratio > maxPollutantRatio && ratio > 1) { // Pollutant exceeds its "moderate" threshold and is the highest ratio so far
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
          // OWM CO is in μg/m³. Convert to mg/m³ for common display (1 mg/m³ = 1000 µg/m³) if desired, or keep as µg/m³.
          // Let's display as mg/m³ for CO as it's often reported that way.
          { name: "CO", value: parseFloat((owmAqiData.components.co / 1000).toFixed(1)), unit: "mg/m³" }, 
        ].filter(p => p.value > 0 || p.value === 0), // Filter out pollutants with no data if needed, or show 0
      };
}
