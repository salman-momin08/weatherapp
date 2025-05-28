// This API route is no longer needed as user creation is handled by /api/auth/signup
// You can delete this file: src/app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: "This user creation endpoint is deprecated. Please use /api/auth/signup." }, { status: 404 });
}
