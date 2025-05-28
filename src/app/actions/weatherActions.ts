
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
    // This is a placeholder. True IANA timezone requires a library or more complex logic.
    // For now, we'll rely on UTC for formatting or client's local time.
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
      // If parsing as JSON fails, use the raw text (or a snippet)
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

    if (location.startsWith('coords:')) {
      const parts = location.substring(7).split(',');
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        throw new Error('Invalid coordinates format. Expected "coords:lat,lon".');
      }
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);

      const reverseGeoDataArr = await safeFetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`, 'reverse geocoding') as OWMGeocodingResponse[];
      if (reverseGeoDataArr && reverseGeoDataArr.length > 0) {
        const { name: rgName, country: rgCountry, state: rgState } = reverseGeoDataArr[0];
        displayLocationName = rgState ? `${rgName}, ${rgState}, ${rgCountry}` : `${rgName}, ${rgCountry}`;
      } else {
        displayLocationName = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
      }
    } else {
      const geoDataArr = await safeFetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`, 'geocoding') as OWMGeocodingResponse[];
      if (!geoDataArr || geoDataArr.length === 0) {
        throw new Error('Location not found. Please try a different search term.');
      }
      const { lat: geoLat, lon: geoLon, name: bestMatchLocationName, country, state } = geoDataArr[0];
      lat = geoLat;
      lon = geoLon;
      displayLocationName = state ? `${bestMatchLocationName}, ${state}, ${country}` : `${bestMatchLocationName}, ${country}`;
    }

    const owmCurrentData = await safeFetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`, 'current weather') as OWMCurrentWeatherAPIResponse;
    cityTimezoneOffsetSeconds = owmCurrentData.timezone;

    const owmForecastData = await safeFetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`, 'forecast') as OWMForecastAPIResponse;
    cityTimezoneOffsetSeconds = owmForecastData.city.timezone || cityTimezoneOffsetSeconds;

    let owmAqiData: OWMAirPollutionData | null = null;
    try {
        const aqiResult = await safeFetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`, 'AQI') as OWMAirPollutionResponse;
        if (aqiResult.list && aqiResult.list.length > 0) {
            owmAqiData = aqiResult.list[0];
        }
    } catch (aqiError) {
        console.warn("Could not fetch AQI data, proceeding without it:", (aqiError as Error).message);
        // AQI is optional, so we don't re-throw the error here.
    }

    const ianaTimezone = getIANATimezoneFromOffset(cityTimezoneOffsetSeconds);

    const current: CurrentWeatherData = {
      locationName: displayLocationName,
      temperature: Math.round(owmCurrentData.main.temp),
      humidity: owmCurrentData.main.humidity,
      description: owmCurrentData.weather[0]?.description || 'N/A',
      icon: mapOwmIconToAppIcon(owmCurrentData.weather[0]?.icon),
      windSpeed: Math.round(owmCurrentData.wind.speed * 3.6),
      feelsLike: Math.round(owmCurrentData.main.feels_like),
      timestamp: owmCurrentData.dt,
    };

    const dailyForecasts: { [dateStr: string]: OWMForecastListItem[] } = {};
    owmForecastData.list.forEach(item => {
      const itemDate = new Date(item.dt * 1000);
      const localItemDate = new Date(itemDate.getTime() + cityTimezoneOffsetSeconds * 1000);
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

      const representativeItem = dayItems.find(item => {
        const hour = new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).getUTCHours();
        return hour >= 12 && hour < 18;
      }) || dayItems[Math.floor(dayItems.length / 2)] || dayItems[0];

      const dailyHourlyForecast: HourlyForecastData[] = dayItems.map(item => ({
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''),
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
      }));

      const dayAqiData = owmAqiData ? transformOwAqiData(owmAqiData, representativeItem.dt, cityTimezoneOffsetSeconds) : undefined;
      const forecastDate = new Date(representativeItem.dt * 1000 + cityTimezoneOffsetSeconds * 1000);

      return {
        date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
        temp_high: Math.round(temp_max),
        temp_low: Math.round(temp_min),
        description: representativeItem.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(representativeItem.weather[0]?.icon),
        aqi: dayAqiData,
        hourlyForecast: dailyHourlyForecast,
      };
    });

    const generalAqi = owmAqiData ? transformOwAqiData(owmAqiData, owmCurrentData.dt, cityTimezoneOffsetSeconds) : undefined;

    const generalHourlyForecast: HourlyForecastData[] = owmForecastData.list.slice(0, 8).map(item => ({
        time: new Date(item.dt * 1000 + cityTimezoneOffsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute:'2-digit', hour12: true, timeZone: 'UTC' }).replace(':00',''),
        temperature: Math.round(item.main.temp),
        description: item.weather[0]?.description || 'N/A',
        icon: mapOwmIconToAppIcon(item.weather[0]?.icon),
    }));


    return {
      current,
      forecast,
      aqi: generalAqi,
      hourlyForecast: generalHourlyForecast,
      timeZone: ianaTimezone,
      resolvedLat: lat,
      resolvedLon: lon,
    };

  } catch (error) {
    console.error("Error in getRealtimeWeatherData:", error);
    if (error instanceof Error) {
      if (error.message.startsWith("Failed to geocode location:") ||
          error.message.startsWith("Location not found") ||
          error.message.startsWith("Failed to fetch current weather data:") ||
          error.message.startsWith("Failed to fetch forecast data:") ||
          error.message.startsWith("Failed to fetch AQI data:") ||
          error.message.startsWith("Invalid API key") ||
          error.message.includes("requires a separate subscription") ||
          error.message.startsWith("Invalid coordinates format") ||
          error.message.startsWith("Failed to fetch")) { // Generic fetch error from safeFetch
        throw new Error(error.message);
      }
      throw new Error(`Could not fetch weather data. Please try again later.`);
    }
    throw new Error("An unknown error occurred while fetching weather data.");
  }
}

function transformOwAqiData(owmAqiData: OWMAirPollutionData, dt: number, timezoneOffsetSeconds: number): AQIData {
    const scaledAqiValue = getDeterministicAQIScaledValue(owmAqiData.main.aqi);

    let dominantPollutant: string | undefined = undefined;
    if (owmAqiData.main.aqi > 2) {
        const components = owmAqiData.components;
        const pollutantLevels = [
            { name: "PM2.5", value: components.pm2_5, threshold: 35 },
            { name: "O3", value: components.o3, threshold: 100 },
            { name: "NO2", value: components.no2, threshold: 100 },
            { name: "PM10", value: components.pm10, threshold: 50 },
            { name: "SO2", value: components.so2, threshold: 75 },
            { name: "CO", value: components.co / 1000, threshold: 9 }
        ];

        let maxPollutantRatio = 0;
        let potentialDominant: string | undefined = undefined;

        for (const p of pollutantLevels) {
            if (p.value > 0 && p.threshold > 0) {
                const ratio = p.value / p.threshold;
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
          { name: "CO", value: parseFloat((owmAqiData.components.co / 1000).toFixed(1)), unit: "mg/m³" },
        ].filter(p => p.value > 0 || p.value === 0),
      };
}
