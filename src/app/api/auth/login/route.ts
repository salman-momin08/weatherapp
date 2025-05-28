// src/app/api/auth/login/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/authUtils';
import type { ClientUser, MongoUser } from '@/types/user';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { email, password } = validation.data;

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ email });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const clientUser: ClientUser = {
      id: user._id!.toString(),
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
    };

    const token = generateToken(clientUser);

    return NextResponse.json({ message: 'Login successful', token, user: clientUser }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
     if (error instanceof SyntaxError && error.message.toLowerCase().includes("json")) {
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred', details: (error as Error).message }, { status: 500 });
  }
}
