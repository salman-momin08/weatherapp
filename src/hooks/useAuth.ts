// src/hooks/useAuth.ts
"use client";
import { useAuth as useAuthFromContext } from '@/context/AuthContext'; // Renamed to avoid naming conflict

export const useAuth = () => {
  return useAuthFromContext();
};
