// This API route is no longer needed as Firebase user sync to MongoDB is removed.
// You can delete this file: src/app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: "User creation API removed. Firebase integration disabled." }, { status: 404 });
}
