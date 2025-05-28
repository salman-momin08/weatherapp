// src/app/api/saved-searches/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSavedSearchesCollection } from '@/lib/mongodb';
import type { WeatherData } from '@/types/weather';
import type { SavedSearch } from '@/types/savedSearch';
import { ObjectId } from 'mongodb';

// GET: Fetch saved searches
export async function GET(request: NextRequest) {
  try {
    const collection = await getSavedSearchesCollection();
    // Fetch all searches, not filtered by userId anymore
    const savedSearches = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(savedSearches, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch saved searches:', error);
    return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 });
  }
}

// POST: Create a new saved search
export async function POST(request: NextRequest) {
  try {
    const { weatherData, locationName, latitude, longitude } = (await request.json()) as { 
      weatherData: WeatherData; 
      locationName: string;
      latitude: number;
      longitude: number;
    };

    if (!weatherData || !locationName || latitude === undefined || longitude === undefined ) {
      return NextResponse.json({ error: 'Missing required fields: weatherData, locationName, latitude, longitude' }, { status: 400 });
    }
    
    const collection = await getSavedSearchesCollection();
    const now = new Date();
    // Removed userId from the newSavedSearch object
    const newSavedSearch: Omit<SavedSearch, '_id' | 'userId'> = {
      locationName: locationName || weatherData.current.locationName,
      latitude,
      longitude,
      weatherSnapshot: weatherData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newSavedSearch as SavedSearch);
    
    if (!result.insertedId) {
        throw new Error("Failed to insert document");
    }

    const insertedDoc = { ...newSavedSearch, _id: result.insertedId };

    return NextResponse.json(insertedDoc, { status: 201 });
  } catch (error: any) {
    console.error('Failed to save search:', error);
    return NextResponse.json({ error: 'Failed to save search', details: error.message }, { status: 500 });
  }
}
