// src/types/savedSearch.ts
import type { WeatherData } from './weather';
import type { ObjectId } from 'mongodb';

export interface SavedSearch {
  _id?: ObjectId; // MongoDB ObjectID
  // userId?: string; // Firebase User ID - Making this optional or removing if truly no user context
  locationName: string;
  latitude: number;
  longitude: number;
  weatherSnapshot: WeatherData;
  createdAt: Date;
  updatedAt: Date;
}
