'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPanel() {
  const [radius, setRadius] = useState([5]);
  const [location, setLocation] = useState('');

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
          <Input
            id="location"
            placeholder="Enter a location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Radius (km)</Label>
          <div className="space-y-2">
            <Slider
              value={radius}
              onValueChange={setRadius}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span className="font-medium">{radius[0]} km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}