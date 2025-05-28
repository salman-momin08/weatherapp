// src/types/savedSearch.ts
import type { WeatherData } from './weather';
import type { ObjectId } from 'mongodb';

export interface SavedSearch {
  _id?: ObjectId; // MongoDB ObjectID
  userId: string; // Firebase User ID
  locationName: string;
  latitude: number;
  longitude: number;
  weatherSnapshot: WeatherData; // Store the full weather data at the time of saving
  // dateRangeStart?: Date; // For future: if users can save for specific date ranges
  // dateRangeEnd?: Date;   // For future
  createdAt: Date;
  updatedAt: Date;
}
