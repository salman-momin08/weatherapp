// src/types/savedSearch.ts
import type { WeatherData } from './weather';
import type { ObjectId } from 'mongodb';

export interface SavedSearch {
  _id?: ObjectId;
  userId: string; // References MongoUser _id
  locationName: string;
  latitude: number;
  longitude: number;
  weatherSnapshot: WeatherData;
  createdAt: Date;
  updatedAt: Date;
}
