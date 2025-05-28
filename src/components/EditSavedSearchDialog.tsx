
// src/components/EditSavedSearchDialog.tsx
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { SavedSearch } from '@/types/savedSearch';

interface EditSavedSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  search: SavedSearch | null;
  onUpdate: (searchId: string, newLocationName: string) => Promise<boolean>;
  isLoading: boolean;
}

export function EditSavedSearchDialog({
  isOpen,
  onOpenChange,
  search,
  onUpdate,
  isLoading,
}: EditSavedSearchDialogProps) {
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    if (search) {
      setLocationName(search.locationName);
    }
  }, [search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!search || !search._id || !locationName.trim()) return;

    const success = await onUpdate(search._id.toString(), locationName.trim());
    if (success) {
      onOpenChange(false); // Close dialog on successful update
    }
  };

  if (!search) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Saved Search</DialogTitle>
          <DialogDescription>
            Update the display name for this saved location. The weather data will also be refreshed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="locationName" className="text-right">
              Location Name
            </Label>
            <Input
              id="locationName"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading || !locationName.trim()}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
