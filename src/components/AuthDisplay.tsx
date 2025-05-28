// src/components/AuthDisplay.tsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User as UserIcon, LogOut, LogIn, UserPlus, Info, Loader2 } from 'lucide-react';

export function AuthDisplay() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
         <Button 
            variant="ghost" 
            size="icon" 
            asChild
            aria-label="Product Manager Accelerator LinkedIn Page"
          >
            <a href="https://www.linkedin.com/company/product-manager-accelerator/" className="group" target="_blank" rel="noopener noreferrer">
              <Info className="h-6 w-6 text-accent group-hover:text-accent-foreground transition-colors" />
            </a>
          </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email || 'User'} />}
                <AvatarFallback>
                  {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon size={16} />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.displayName || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Add links to profile or settings pages here if needed */}
            {/* <DropdownMenuItem>Profile</DropdownMenuItem> */}
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
       <Button 
            variant="ghost" 
            size="icon" 
            asChild
            aria-label="Product Manager Accelerator LinkedIn Page"
          >
            <a href="https://www.linkedin.com/company/product-manager-accelerator/" className="group" target="_blank" rel="noopener noreferrer">
              <Info className="h-6 w-6 text-accent group-hover:text-accent-foreground transition-colors" />
            </a>
        </Button>
      <Button variant="outline" asChild>
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" /> Login
        </Link>
      </Button>
      <Button asChild>
        <Link href="/signup">
          <UserPlus className="mr-2 h-4 w-4" /> Sign Up
        </Link>
      </Button>
    </div>
  );
}
