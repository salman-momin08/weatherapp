// src/app/api/saved-searches/[searchId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSavedSearchesCollection } from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/authUtils';
import { ObjectId } from 'mongodb';

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
      userId: userId // Ensure the user owns this search
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
