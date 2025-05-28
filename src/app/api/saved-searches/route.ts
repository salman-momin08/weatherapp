
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
    const savedSearches = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(savedSearches, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch saved searches:', error);
    return NextResponse.json({ error: 'Failed to fetch saved searches', details: (error as Error).message }, { status: 500 });
  }
}

// POST: Create a new saved search
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { weatherData, locationName, latitude, longitude } = requestBody as {
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
    const newSavedSearch: Omit<SavedSearch, '_id'> = { // Omit _id as it's auto-generated
      locationName: locationName || weatherData.current.locationName,
      latitude,
      longitude,
      weatherSnapshot: weatherData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newSavedSearch as SavedSearch);

    if (!result.insertedId) {
        throw new Error("Failed to insert document into MongoDB.");
    }

    const insertedDoc = { ...newSavedSearch, _id: result.insertedId };

    return NextResponse.json(insertedDoc, { status: 201 });
  } catch (error: any) {
    console.error('Failed to save search:', error);
    // Handle cases where request.json() might fail (e.g., invalid JSON body)
    if (error instanceof SyntaxError && error.message.toLowerCase().includes("json")) {
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save search', details: error.message }, { status: 500 });
  }
}
