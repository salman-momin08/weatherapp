// src/app/actions/weatherActions.ts
'use server';

import type { WeatherData, CurrentWeatherData, ForecastDayData, AQIData, AQIPollutant, HourlyForecastData } from '@/types/weather';

// Helper function to create a simple numeric hash from a string for seeding randomness
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Helper to get AQI category based on value
const getAQICategory = (aqiValue: number): string => {
  if (aqiValue <= 50) return "Good";
  if (aqiValue <= 100) return "Moderate";
  if (aqiValue <= 150) return "Unhealthy for Sensitive Groups";
  if (aqiValue <= 200) return "Unhealthy";
  if (aqiValue <= 300) return "Very Unhealthy";
  return "Hazardous";
};

// Generates dynamic mock AQI data
const generateDynamicMockAQI = (location: string, dayOffset: number = 0): AQIData => {
  // Seed randomness with location, day offset, and current minute for dynamic changes
  const baseSeed = simpleHash(location) + dayOffset * 1000 + new Date().getMinutes();
  const baseAqiValue = 10 + (baseSeed % 290); // Base AQI from 10 to 300

  // Make AQI value slightly variable around the base
  const aqiValue = Math.max(10, Math.min(500, Math.floor(baseAqiValue + ((baseSeed % 50) - 25))));
  
  const pollutantsList: {name: string, unit: string, multiplier: number, offset: number}[] = [
      { name: "PM2.5", unit: "µg/m³", multiplier: (0.4 + (baseSeed % 5) / 10), offset: (baseSeed % 10) }, // e.g. 0.4 to 0.8
      { name: "PM10", unit: "µg/m³", multiplier: (0.6 + (baseSeed % 7) / 10), offset: (baseSeed % 15) }, // e.g. 0.6 to 1.2
      { name: "O3", unit: "ppb", multiplier: (0.2 + (baseSeed % 4) / 10), offset: (baseSeed % 20) },   // e.g. 0.2 to 0.5
      { name: "NO2", unit: "ppb", multiplier: (0.1 + (baseSeed % 3) / 10), offset: (baseSeed % 10) },  // e.g. 0.1 to 0.3
      { name: "SO2", unit: "ppb", multiplier: (0.05 + (baseSeed % 2) / 10), offset: (baseSeed % 5) }, // e.g. 0.05 to 0.15
      { name: "CO", unit: "ppm", multiplier: (0.02 + (baseSeed % 2) / 100), offset: (baseSeed % 2) },// e.g. 0.02 to 0.03
  ];

  return {
    value: aqiValue,
    category: getAQICategory(aqiValue),
    dominantPollutant: ["PM2.5", "O3", "PM10"][(baseSeed % 3)],
    pollutants: pollutantsList.map(p => ({
        name: p.name,
        value: Math.max(0, Math.round(aqiValue * p.multiplier + p.offset * ((baseSeed % 3) -1) ) ),
        unit: p.unit,
    })).filter(p => p.value > 0),
  };
};

// Generates dynamic mock hourly forecast data
const generateDynamicMockHourlyForecast = (location: string, baseTempForDay: number): HourlyForecastData[] => {
  const hourly: HourlyForecastData[] = [];
  const currentHour = new Date().getHours(); // For a future day, this would typically start from 0 or relevant hour
  const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Thunderstorm', 'Snowy', 'Foggy', 'Drizzle', 'Clear'];
  const icons = ['Sun', 'Cloud', 'CloudRain', 'CloudSun', 'CloudLightning', 'CloudSnow', 'CloudFog', 'CloudDrizzle', 'Sun'];
  
  // Seed randomness with location and current minute for dynamic changes
  const seed = simpleHash(location) + new Date().getMinutes();

  for (let i = 0; i < 12; i++) { // Generate 12 hours of forecast data
    const hour = (currentHour + i) % 24;
    const hourSeed = seed + i * 10; // Vary seed for each hour
    const conditionIndex = hourSeed % weatherConditions.length;
    hourly.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      // Temperature varies slightly around the day's base temperature
      temperature: Math.round(baseTempForDay + (hourSeed % 6) - 3), 
      description: weatherConditions[conditionIndex],
      icon: icons[conditionIndex],
    });
  }
  return hourly;
};


export async function getRealtimeWeatherData(location: string): Promise<WeatherData> {
  // !! IMPORTANT !!
  // This function currently returns DYNAMIC MOCK DATA.
  // To get actual real-time weather, you need to:
  // 1. Sign up for a weather API service (e.g., OpenWeatherMap, WeatherAPI.com, AccuWeather).
  // 2. Get an API key from the service.
  // 3. Store your API key securely, preferably in an environment variable (e.g., in a .env.local file).
  //    Example for .env.local:
  //    WEATHER_API_KEY=your_actual_api_key_here
  // 4. Replace the mock data generation below with actual API calls using `fetch`.
  //    Make sure your .env.local file is listed in .gitignore.

  // console.log(`Fetching "real-time" (dynamic mock) weather for: ${location}`);
  // const apiKey = process.env.WEATHER_API_KEY;

  // if (!apiKey) {
  //   console.warn("Weather API key is missing (WEATHER_API_KEY not found in .env.local). Serving dynamic mock data. See src/app/actions/weatherActions.ts for integration steps.");
  //   // Fallback to dynamic mock data if API key is missing.
  // } else {
  //   // --- BEGIN ACTUAL API CALL SECTION (EXAMPLE) ---
  //   try {
  //     // Example: Using OpenWeatherMap's One Call API (requires lat/lon)
  //     // You might need a preliminary call to a geocoding API to convert 'location' (city name) to lat/lon.
  //     // const geocodingResponse = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`);
  //     // if (!geocodingResponse.ok) throw new Error('Failed to geocode location');
  //     // const geoData = await geocodingResponse.json();
  //     // if (!geoData || geoData.length === 0) throw new Error('Location not found');
  //     // const { lat, lon } = geoData[0];

  //     // const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${apiKey}&units=metric`); // Or your chosen API endpoint
  //     // if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
  //     // const apiData = await weatherResponse.json();

  //     // TODO: Transform 'apiData' from your chosen API's structure to the 'WeatherData' interface used by this app.
  //     // This involves mapping fields for current weather, daily forecast, AQI, and hourly forecast.
  //     // For example:
  //     // const transformedData: WeatherData = {
  //     //   current: {
  //     //     locationName: location.startsWith("coords:") ? geoData[0].name : location,
  //     //     temperature: apiData.current.temp,
  //     //     humidity: apiData.current.humidity,
  //     //     description: apiData.current.weather[0].description,
  //     //     icon: mapApiIconToAppIcon(apiData.current.weather[0].icon), // You'll need an icon mapping function
  //     //     windSpeed: apiData.current.wind_speed,
  //     //     feelsLike: apiData.current.feels_like,
  //     //     timestamp: apiData.current.dt,
  //     //   },
  //     //   forecast: apiData.daily.slice(0, 7).map((day: any) => ({ /* ... map daily forecast ... */ })),
  //     //   aqi: { /* ... map AQI data, might require a separate API call for some services ... */ },
  //     //   hourlyForecast: apiData.hourly.slice(0, 12).map((hour: any) => ({ /* ... map hourly forecast ... */ })),
  //     // };
  //     // return transformedData;

  //   } catch (error) {
  //     console.error("Error fetching or transforming real weather data:", error);
  //     // Fall through to serve dynamic mock data on error
  //   }
  //   // --- END ACTUAL API CALL SECTION ---
  // }


  // --- Dynamic Mock Data Generation (Fallback / Placeholder) ---
  // Seed changes based on location and current minute for dynamism
  const seed = simpleHash(location) + Math.floor(new Date().getTime() / 60000); 

  const baseTemp = 10 + (seed % 25); // Base temp 10-34 C, varies with location and time

  const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Thunderstorm', 'Snowy', 'Foggy', 'Drizzle', 'Clear'];
  const icons = ['Sun', 'Cloud', 'CloudRain', 'CloudSun', 'CloudLightning', 'CloudSnow', 'CloudFog', 'CloudDrizzle', 'Sun'];
  
  const currentRandomIndex = seed % weatherConditions.length;
  const current: CurrentWeatherData = {
    locationName: location.startsWith("coords:") ? "Current Location (Dynamic Mock)" : location,
    temperature: baseTemp + ((seed % 10) - 5), // +/- 5 from base
    humidity: 30 + (seed % 60), // 30-90%
    description: weatherConditions[currentRandomIndex],
    icon: icons[currentRandomIndex],
    windSpeed: 2 + (seed % 28), // 2-30 km/h
    feelsLike: baseTemp + ((seed % 12) - 7), // Feels like can vary more
    timestamp: Math.floor(Date.now() / 1000),
  };

  const forecast: ForecastDayData[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    
    const daySeed = seed + i * 100 + (simpleHash(forecastDate.toDateString()) % 100); // Ensure day's data is somewhat consistent for the day but varies from other days
    const dayTempVariation = (daySeed % 7) - 3; // +/- 3 for daily variation from main base
    const dayBaseTemp = baseTemp + dayTempVariation;
    const dayRandomIndex = daySeed % weatherConditions.length;

    forecast.push({
      date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      temp_high: dayBaseTemp + 4 + (daySeed % 4), // Highs are warmer
      temp_low: dayBaseTemp - 4 - (daySeed % 3),  // Lows are cooler
      description: weatherConditions[dayRandomIndex],
      icon: icons[dayRandomIndex],
      aqi: generateDynamicMockAQI(location, i + (daySeed % 5)), // Add more variance to AQI
      hourlyForecast: generateDynamicMockHourlyForecast(location, dayBaseTemp + (daySeed % 3) -1), // Slightly vary base for hourly
    });
  }
  
  // For the main display, AQI and Hourly are from "today's" forecast (first item)
  const currentDayForecast = forecast[0];

  return {
    current,
    forecast, // This now contains AQI and hourly for each day
    aqi: currentDayForecast?.aqi, // This remains the general "today's" AQI for initial display
    hourlyForecast: currentDayForecast?.hourlyForecast, // General "today's" hourly for initial display
  };
}
