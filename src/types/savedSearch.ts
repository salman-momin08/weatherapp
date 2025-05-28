
// src/types/savedSearch.ts
import type { WeatherDataCore } from './weather'; // Updated to WeatherDataCore
import type { ObjectId } from 'mongodb';

export interface SavedSearch {
  _id?: ObjectId; // MongoDB ObjectId
  userId: ObjectId;
  locationName: string;
  latitude: number;
  longitude: number;
  weatherSnapshot: WeatherDataCore; // Use WeatherDataCore
  createdAt: Date;
  updatedAt: Date;
}

