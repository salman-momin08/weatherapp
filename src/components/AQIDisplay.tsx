
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
    case "unhealthy for sensitive groups":
      return "bg-orange-600 hover:bg-orange-600";
    case "unhealthy":
      return "bg-red-500 hover:bg-red-500";
    case "very unhealthy":
      return "bg-purple-600 hover:bg-purple-600";
    case "hazardous":
      return "bg-maroon-700 hover:bg-maroon-700"; 
    default:
      return "bg-gray-500 hover:bg-gray-500";
  }
};

export function AQIDisplay({ data, displayForDate }: AQIDisplayProps) {
  const title = `Air Quality Index (AQI) ${displayForDate ? `for ${displayForDate}` : ''}`;
  return (
    <Card className="w-full max-w-md mx-auto shadow-xl bg-gradient-to-br from-primary/80 to-background/70 backdrop-blur-sm text-card-foreground">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-2xl flex items-center justify-center text-card-foreground"> {/* Ensure title text uses card-foreground */}
          <Leaf className="mr-2 text-card-foreground" /> {title} {/* Icon uses card-foreground */}
        </CardTitle>
        {data.dominantPollutant && (
          <CardDescription className="text-sm text-card-foreground/80"> {/* Description uses card-foreground */}
            Dominant pollutant: {data.dominantPollutant}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="my-4">
          <Badge className={`text-3xl px-4 py-2 text-white ${getAQIColorClass(data.category)}`}>
            {data.value}
          </Badge>
          <p className="text-lg font-semibold mt-2 text-card-foreground">{data.category}</p> {/* Category text uses card-foreground */}
        </div>
        
        {data.pollutants && data.pollutants.length > 0 && (
          <div className="w-full text-sm mb-4">
            <h4 className="font-semibold mb-2 text-center text-card-foreground/80">Pollutant Details:</h4> {/* Heading uses card-foreground */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.pollutants.map((pollutant) => (
                // Apply frosted glass effect to pollutant detail cards
                <div key={pollutant.name} className="p-3 bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/30 text-foreground text-center">
                  <p className="font-medium">{pollutant.name}</p> {/* Text inside uses foreground (dark blue) */}
                  <p className="text-foreground/80">{pollutant.value} {pollutant.unit}</p> {/* Text inside uses foreground (dark blue) */}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.value > 100 && (
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
