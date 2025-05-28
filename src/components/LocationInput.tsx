
// src/components/LocationInput.tsx
"use client";

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, LocateFixed, Search } from 'lucide-react';

interface LocationInputProps {
  onSearch: (location: string) => void;
  onGeolocate: () => void;
  isLoading: boolean;
}

export function LocationInput({ onSearch, onGeolocate, isLoading }: LocationInputProps) {
  const [location, setLocation] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      onSearch(location.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-xl mx-auto mb-8 p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg">
      <Input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="City, ZIP (e.g., 90210,US), landmark, or coords:lat,lon"
        className="flex-grow text-base"
        disabled={isLoading}
      />
      <div className="flex gap-2 w-full sm:w-auto">
        <Button type="submit" className="w-1/2 sm:w-auto" disabled={isLoading || !location.trim()}>
          {isLoading && !location.trim() ? <Loader2 className="animate-spin" /> : <Search />}
          <span className="ml-2 hidden sm:inline">Search</span>
        </Button>
        <Button type="button" variant="outline" onClick={onGeolocate} className="w-1/2 sm:w-auto" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          <span className="ml-2 hidden sm:inline">My Location</span>
        </Button>
      </div>
    </form>
  );
}
