// src/components/SavedSearchItem.tsx
"use client";

import type { SavedSearch } from '@/types/savedSearch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Thermometer, CalendarDays, Trash2, Eye } from 'lucide-react'; 
import { getWeatherIcon } from '@/lib/weather-utils';

interface SavedSearchItemProps {
  search: SavedSearch;
  onView: (search: SavedSearch) => void; 
  onDelete: (searchId: string) => void; 
}

export function SavedSearchItem({ search, onView, onDelete }: SavedSearchItemProps) {
  const { locationName, weatherSnapshot, createdAt, _id } = search;
  const currentSnapshot = weatherSnapshot.current;

  const handleDelete = () => {
    if (_id) {
      // Optional: Add a confirmation dialog here before calling onDelete
      // For now, directly call onDelete
      onDelete(_id.toString());
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-primary" />
              {locationName}
            </CardTitle>
            <CardDescription>
              Saved: {new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center text-accent">
            {getWeatherIcon(currentSnapshot.icon, { size: 32 })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-lg">
          <Thermometer className="mr-2 h-5 w-5 text-muted-foreground" />
          Temperature: {currentSnapshot.temperature}°C
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {currentSnapshot.description}
        </p>
        {weatherSnapshot.aqi && (
          <p className="text-sm text-muted-foreground">
            AQI: {weatherSnapshot.aqi.value} ({weatherSnapshot.aqi.category})
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleDelete} aria-label="Delete search">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => onView(search)} aria-label="View search details">
          <Eye className="mr-1.5 h-4 w-4" /> View / Load
        </Button>
      </CardFooter>
    </Card>
  );
}
