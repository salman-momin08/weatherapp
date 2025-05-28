// src/app/api/users/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import { adminAuth } from '@/lib/firebaseAdmin';
import type { MongoUser } from '@/types/user';
import type { DecodedIdToken } from 'firebase-admin/auth';

async function verifyToken(req: NextRequest): Promise<DecodedIdToken | null> {
  const authorization = req.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const idToken = authorization.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return null;
    }
  }
  return null;
}

// POST: Create a new user record in MongoDB after Firebase signup
export async function POST(request: NextRequest) {
  const decodedToken = await verifyToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
  }

  const { uid, email, name, picture, email_verified, sign_in_provider } = decodedToken;
  const creationTime = decodedToken.firebase.sign_in_attributes?.creationTimestamp || decodedToken.auth_time * 1000;


  if (!uid || !email) {
    return NextResponse.json({ error: 'Missing UID or email in token' }, { status: 400 });
  }

  try {
    const usersCollection = await getUsersCollection();

    // Check if user already exists to prevent duplicates (optional, but good practice)
    const existingUser = await usersCollection.findOne({ firebaseUid: uid });
    if (existingUser) {
      // User already exists, could be a retry or an edge case.
      // You might want to update the existing record or just return success.
      return NextResponse.json(existingUser, { status: 200 });
    }

    const newUserDocument: MongoUser = {
      firebaseUid: uid,
      email: email,
      displayName: name || null, // Firebase provides 'name', map it to displayName
      photoURL: picture || null, // Firebase provides 'picture', map it to photoURL
      createdAt: creationTime ? new Date(creationTime) : new Date(), // Fallback to now if creationTime is missing
      // Add any other default fields for a new user here
    };

    const result = await usersCollection.insertOne(newUserDocument);

    if (!result.insertedId) {
        throw new Error("Failed to insert user document into MongoDB");
    }
    
    const insertedDoc = { ...newUserDocument, _id: result.insertedId };

    return NextResponse.json(insertedDoc, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create user record in MongoDB:', error);
    return NextResponse.json({ error: 'Failed to save user data', details: error.message }, { status: 500 });
  }
}
