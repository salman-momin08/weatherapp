
// src/app/api/saved-searches/[searchId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSavedSearchesCollection } from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/authUtils';
import { ObjectId } from 'mongodb';
import type { SavedSearch } from '@/types/savedSearch';
import { getRealtimeWeatherData } from '@/app/actions/weatherActions'; // For refreshing weather data

interface Params {
  searchId: string;
}

// DELETE: Delete a specific saved search for the authenticated user
export async function DELETE(request: NextRequest, context: { params: Params }) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchId } = context.params;

    if (!ObjectId.isValid(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID format' }, { status: 400 });
    }

    const collection = await getSavedSearchesCollection();
    const result = await collection.deleteOne({ 
      _id: new ObjectId(searchId), 
      userId: new ObjectId(userId) // Ensure the user owns this search
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Saved search not found or user not authorized to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Saved search deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete saved search:', error);
    return NextResponse.json({ error: 'Failed to delete saved search', details: (error as Error).message }, { status: 500 });
  }
}

// PUT: Update a specific saved search for the authenticated user
export async function PUT(request: NextRequest, context: { params: Params }) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchId } = context.params;

    if (!ObjectId.isValid(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID format' }, { status: 400 });
    }

    const body = await request.json();
    const { locationName } = body as { locationName?: string };

    if (!locationName || locationName.trim() === "") {
      return NextResponse.json({ error: 'Location name cannot be empty' }, { status: 400 });
    }

    const collection = await getSavedSearchesCollection();
    const existingSearch = await collection.findOne({
      _id: new ObjectId(searchId),
      userId: new ObjectId(userId),
    });

    if (!existingSearch) {
      return NextResponse.json({ error: 'Saved search not found or user not authorized to update' }, { status: 404 });
    }

    // Refresh weather data using existing coordinates
    let refreshedWeatherData;
    try {
      // Construct location string from coordinates for getRealtimeWeatherData
      const locationString = `coords:${existingSearch.latitude},${existingSearch.longitude}`;
      refreshedWeatherData = await getRealtimeWeatherData(locationString);
    } catch (weatherError) {
      console.error("Failed to refresh weather data during update:", weatherError);
      // Decide if you want to proceed without refreshing or return an error
      // For now, let's return an error if weather refresh fails, as it's part of the intended update
      return NextResponse.json({ error: 'Failed to refresh weather data for the location', details: (weatherError as Error).message }, { status: 500 });
    }
    
    const now = new Date();
    const updateDoc: Partial<SavedSearch> = {
      locationName: locationName.trim(),
      weatherSnapshot: refreshedWeatherData, // Use the newly fetched weather data
      updatedAt: now,
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(searchId), userId: new ObjectId(userId) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      // This case should ideally be caught by the findOne check above
      return NextResponse.json({ error: 'Saved search not found or user not authorized' }, { status: 404 });
    }
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      // No actual change was made (e.g., submitted same locationName and weather didn't change)
      // Return the existing search as if it were updated to avoid client confusion
      const unmodifiedSearch = await collection.findOne({ _id: new ObjectId(searchId) });
      return NextResponse.json(unmodifiedSearch, { status: 200 });
    }

    const updatedSearch = await collection.findOne({ _id: new ObjectId(searchId) });
    return NextResponse.json(updatedSearch, { status: 200 });

  } catch (error) {
    console.error('Failed to update saved search:', error);
     if (error instanceof SyntaxError && error.message.toLowerCase().includes("json")) {
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update saved search', details: (error as Error).message }, { status: 500 });
  }
}
