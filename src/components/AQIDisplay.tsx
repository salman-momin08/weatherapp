
// src/components/AQIDisplay.tsx
"use client";

import type { AQIData } from '@/types/weather';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, AlertTriangle } from 'lucide-react';

interface AQIDisplayProps {
  data: AQIData;
  displayForDate?: string;
}

const getAQIColorClass = (category: string): string => {
  switch (category.toLowerCase()) {
    case "good":
      return "bg-green-500 hover:bg-green-500";
    case "fair":
      return "bg-yellow-500 hover:bg-yellow-500";
    case "moderate":
      return "bg-orange-500 hover:bg-orange-500";
    case "unhealthy for sensitive groups": // Kept for completeness, map "Unhealthy" to this if needed
      return "bg-orange-600 hover:bg-orange-600";
    case "unhealthy":
      return "bg-red-500 hover:bg-red-500";
    case "very unhealthy":
      return "bg-purple-600 hover:bg-purple-600";
    case "hazardous": // For very high values if your data supports it
      return "bg-maroon-700 hover:bg-maroon-700"; 
    default:
      return "bg-gray-500 hover:bg-gray-500";
  }
};

export function AQIDisplay({ data, displayForDate }: AQIDisplayProps) {
  const title = `Air Quality Index (AQI) ${displayForDate ? `for ${displayForDate}` : ''}`;
  return (
    <Card className="w-full max-w-md mx-auto shadow-xl bg-card text-card-foreground"> {/* White card */}
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-2xl flex items-center justify-center">
          <Leaf className="mr-2 text-primary" /> {title} {/* Primary color for icon */}
        </CardTitle>
        {data.dominantPollutant && (
          <CardDescription className="text-sm text-muted-foreground">
            Dominant pollutant: {data.dominantPollutant}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="my-4">
          <Badge className={`text-3xl px-4 py-2 text-white ${getAQIColorClass(data.category)}`}>
            {data.value}
          </Badge>
          <p className="text-lg font-semibold mt-2">{data.category}</p>
        </div>
        
        {data.pollutants && data.pollutants.length > 0 && (
          <div className="w-full text-sm mb-4">
            <h4 className="font-semibold mb-2 text-center text-muted-foreground">Pollutant Details:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.pollutants.map((pollutant) => (
                <div key={pollutant.name} className="p-3 bg-background rounded-lg shadow-sm border border-border text-card-foreground text-center"> {/* Subtle inner card */}
                  <p className="font-medium">{pollutant.name}</p>
                  <p className="text-muted-foreground">{pollutant.value} {pollutant.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.value > 100 && ( // Example threshold for advisory
           <Badge variant="outline" className="mt-2 p-2 text-xs text-center w-full bg-yellow-400/30 dark:bg-yellow-700/30 border-yellow-500/70 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle size={14} className="mr-1 inline-block" />
             <span className="font-semibold mr-1">Health Advisory:</span> 
             {data.category.toLowerCase().includes("sensitive") ? "Members of sensitive groups may experience health effects." : "Everyone may begin to experience health effects."}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
