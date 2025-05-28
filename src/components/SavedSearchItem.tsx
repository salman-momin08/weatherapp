
// src/components/SavedSearchItem.tsx
"use client";

import type { SavedSearch } from '@/types/savedSearch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Thermometer, Trash2, Eye, Edit3 } from 'lucide-react'; 
import { getWeatherIcon } from '@/lib/weather-utils';

interface SavedSearchItemProps {
  search: SavedSearch;
  onView: (search: SavedSearch) => void; 
  onDelete: (searchId: string) => void; 
  onEdit: (search: SavedSearch) => void; 
  isDeleting: boolean; 
  isEditing: boolean; 
}

export function SavedSearchItem({ search, onView, onDelete, onEdit, isDeleting, isEditing }: SavedSearchItemProps) {
  const { locationName, weatherSnapshot, createdAt, _id } = search;
  const currentSnapshot = weatherSnapshot.current;

  const handleDelete = () => {
    if (_id) {
      onDelete(_id.toString());
    }
  };

  const handleEdit = () => {
    onEdit(search);
  };

  const anyOperationInProgress = isDeleting || isEditing;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-primary/80 to-background/70 backdrop-blur-sm text-card-foreground">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center text-card-foreground"> {/* Ensure text uses card-foreground */}
              <MapPin className="mr-2 h-5 w-5 text-card-foreground" /> {/* Icon uses card-foreground */}
              {locationName}
            </CardTitle>
            <CardDescription className="text-card-foreground/80"> {/* Description uses card-foreground */}
              Saved: {new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString()}
              {search.updatedAt && new Date(search.updatedAt).getTime() !== new Date(search.createdAt).getTime() && (
                <span className="block text-xs">Updated: {new Date(search.updatedAt).toLocaleDateString()} {new Date(search.updatedAt).toLocaleTimeString()}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center text-card-foreground"> {/* Icon parent uses card-foreground */}
            {getWeatherIcon(currentSnapshot.icon, { size: 32 })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-card-foreground"> {/* Ensure content text uses card-foreground */}
        <div className="flex items-center text-lg">
          <Thermometer className="mr-2 h-5 w-5 text-card-foreground/80" /> {/* Icon uses card-foreground */}
          Temperature: {currentSnapshot.temperature}°C
        </div>
        <p className="text-sm text-card-foreground/80 capitalize">
          {currentSnapshot.description}
        </p>
        {weatherSnapshot.aqi && (
          <p className="text-sm text-card-foreground/80">
            AQI: {weatherSnapshot.aqi.value} ({weatherSnapshot.aqi.category})
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleEdit} aria-label="Edit search" disabled={anyOperationInProgress} className="bg-background/30 text-foreground hover:bg-background/50">
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleDelete} aria-label="Delete search" disabled={anyOperationInProgress} className="bg-background/30 text-foreground hover:bg-background/50">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => onView(search)} aria-label="View search details" disabled={anyOperationInProgress} className="bg-primary-foreground text-primary hover:bg-primary-foreground/80">
          <Eye className="mr-1.5 h-4 w-4" /> View / Load
        </Button>
      </CardFooter>
    </Card>
  );
}
