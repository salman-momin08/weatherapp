// src/app/api/auth/signup/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { MongoUser } from '@/types/user';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  mobileNumber: z.string().min(10, { message: 'Mobile number must be at least 10 digits' })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid mobile number format' }), // Basic E.164 format check
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password, mobileNumber } = validation.data;

    const usersCollection = await getUsersCollection();

    // Check if user already exists
    const existingUserByEmail = await usersCollection.findOne({ email });
    if (existingUserByEmail) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }
    // Optionally, check for existing mobile number if it should be unique
    // const existingUserByMobile = await usersCollection.findOne({ mobileNumber });
    // if (existingUserByMobile) {
    //   return NextResponse.json({ error: 'User with this mobile number already exists' }, { status: 409 });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const newUser: Omit<MongoUser, '_id' | 'password'> & { password?: string } = {
      name,
      email,
      password: hashedPassword,
      mobileNumber,
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(newUser as MongoUser); // Assert type after adding password

    if (!result.insertedId) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    
    // Don't send password back
    const createdUserForResponse = {
        _id: result.insertedId,
        name,
        email,
        mobileNumber,
        createdAt: newUser.createdAt
    }

    return NextResponse.json({ message: 'User created successfully', user: createdUserForResponse }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof SyntaxError && error.message.toLowerCase().includes("json")) {
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred', details: (error as Error).message }, { status: 500 });
  }
}
