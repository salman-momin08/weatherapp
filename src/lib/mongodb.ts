// src/lib/mongodb.ts
import { MongoClient, type Db, type Collection } from 'mongodb';
import type { SavedSearch } from '@/types/savedSearch';
import type { MongoUser } from '@/types/user'; // This type might be unused now

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};
const DB_NAME = 'WeatherEyesDB'; // Explicitly define the database name

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // @ts-ignore
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    // @ts-ignore
    global._mongoClientPromise = client.connect();
  }
  // @ts-ignore
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const mongoClient = await clientPromise;
  return mongoClient.db(DB_NAME); // Use the explicitly defined database name
}

export async function getSavedSearchesCollection(): Promise<Collection<SavedSearch>> {
  const db = await getDb();
  return db.collection<SavedSearch>('savedSearches');
}

// This function and the MongoUser type are likely remnants from the Firebase user sync.
// The 'users' collection is not actively used by the current global saved search feature.
export async function getUsersCollection(): Promise<Collection<MongoUser>> {
  const db = await getDb();
  return db.collection<MongoUser>('users');
}

export default clientPromise;
