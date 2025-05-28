// This component is no longer used as Firebase Authentication has been removed.
// You can delete this file: src/components/AuthDisplay.tsx
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export function AuthDisplay() {
  // Fallback content or can be an empty div if header is adjusted
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
    </div>
  );
}
