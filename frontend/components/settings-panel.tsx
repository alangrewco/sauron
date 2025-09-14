'use client';

import { useEffect, useState } from 'react';
import { FilterAccordion } from './filter-accordion';
import MapboxSearchBox from './mapbox-search-box';
import { Label } from './ui/label';
import { useDevices } from '@/hooks/use-devices';

interface SettingsPanelProps {
  accessToken: string;
  onLocationSelect: (coordinates: [number, number], placeName: string) => void;
  currentCenter?: [number, number];
}

export default function SettingsPanel({ accessToken, onLocationSelect, currentCenter }: SettingsPanelProps) {
  const [isStatic, setIsStatic] = useState(false);

  // Use the hook here, passing isStatic
  const { devices, points, loading, error, refetch } = useDevices({ isStatic });

  useEffect(() => {
    refetch(); // refetch devices when isStatic changes
  }, [isStatic]);

  return (
    <div className="h-full p-4 bg-background">
      <div className="space-y-6">

        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Sauron
        </h1>

        <div className="space-y-3">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <MapboxSearchBox
            accessToken={accessToken}
            onLocationSelect={onLocationSelect}
            placeholder="Search for a location..."
            className="w-full"
          />
          {currentCenter && (
            <div className="text-xs text-muted-foreground mt-2 font-mono">
              {currentCenter[1].toFixed(6)}, {currentCenter[0].toFixed(6)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <FilterAccordion onStaticChange={setIsStatic}/>
        </div>

      </div>
    </div>
  );
}
