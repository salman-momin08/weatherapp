// src/app/api/saved-searches/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSavedSearchesCollection } from '@/lib/mongodb';
import { adminAuth } from '@/lib/firebaseAdmin'; // For token verification
import type { WeatherData } from '@/types/weather';
import type { SavedSearch } from '@/types/savedSearch';
import { ObjectId } from 'mongodb';

async function verifyToken(req: NextRequest): Promise<string | null> {
  const authorization = req.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const idToken = authorization.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return decodedToken.uid;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }
  return null;
}

// GET: Fetch saved searches for the authenticated user
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const collection = await getSavedSearchesCollection();
    const savedSearches = await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(savedSearches, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch saved searches:', error);
    return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 });
  }
}

// POST: Create a new saved search
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const newSavedSearch: Omit<SavedSearch, '_id'> = {
      userId,
      locationName: locationName || weatherData.current.locationName, // Ensure locationName is present
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
