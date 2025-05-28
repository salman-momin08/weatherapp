// src/types/user.ts
import type { ObjectId } from 'mongodb';

export interface MongoUser {
  _id?: ObjectId; // MongoDB ObjectID
  firebaseUid: string; // Firebase User ID (UID)
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null; // If you plan to store this
  createdAt: Date; // Firebase user creation time
  // Add any other app-specific user fields here
  // e.g., preferences: object;
  // e.g., lastLoginAt: Date;
}
