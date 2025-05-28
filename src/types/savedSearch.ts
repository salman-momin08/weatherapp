
// src/types/savedSearch.ts
import type { WeatherData } from './weather';
import type { ObjectId } from 'mongodb';

export interface SavedSearch {
  _id?: ObjectId; // MongoDB ObjectId
  userId: ObjectId; // References MongoUser _id, stored as ObjectId in DB
  locationName: string;
  latitude: number;
  longitude: number;
  weatherSnapshot: WeatherData;
  createdAt: Date;
  updatedAt: Date; // Add updatedAt
}
