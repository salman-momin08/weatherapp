// src/lib/authUtils.ts
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import type { ClientUser } from '@/types/user';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

export function generateToken(user: ClientUser): string {
  return jwt.sign({ userId: user.id, email: user.email, name: user.name, mobileNumber: user.mobileNumber }, JWT_SECRET!, {
    expiresIn: '1d', // Token expires in 1 day
  });
}

export function verifyToken(token: string): ClientUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as (ClientUser & { userId: string });
    // Map userId from token to id for ClientUser consistency
    return { id: decoded.userId, email: decoded.email, name: decoded.name, mobileNumber: decoded.mobileNumber };
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove "Bearer "
    const decodedUser = verifyToken(token);
    return decodedUser ? decodedUser.id : null;
  }
  return null;
}
