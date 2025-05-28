// src/types/user.ts
import type { ObjectId } from 'mongodb';

export interface MongoUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string; // Will be hashed, and not sent to client
  mobileNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// For JWT payload and client-side user object
export interface ClientUser {
  id: string; // MongoDB ObjectId as string
  name: string;
  email: string;
  mobileNumber: string;
}
