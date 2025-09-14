'use client';

import Image from 'next/image';
import { FilterAccordion } from './filter-accordion';
import MapboxSearchBox from './mapbox-search-box';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Chatbot } from './chatbot';
import { Separator } from './ui/separator';

interface SettingsPanelProps {
  accessToken: string;
  onLocationSelect: (coordinates: [number, number], placeName: string) => void;
  currentCenter?: [number, number];
  
  // Filter states
  radius: number;
  onRadiusChange: (radius: number) => void;
  showStatic: boolean;
  onShowStaticChange: (show: boolean) => void;

  // Timeline states
  timeRange: { min: number, max: number } | null;
  currentMinute: number;
  onCurrentMinuteChange: (minute: number) => void;
}

export default function SettingsPanel({ 
  accessToken, 
  onLocationSelect, 
  currentCenter,
  radius,
  onRadiusChange,
  showStatic,
  onShowStaticChange,
  timeRange,
  currentMinute,
  onCurrentMinuteChange
}: SettingsPanelProps) {

  const formattedTime = timeRange 
    ? new Date(timeRange.min + (currentMinute * 60 * 1000)).toLocaleString() 
    : 'Loading...';

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 space-y-6 overflow-y-auto">

        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Sauron
        </h1>
      
        <Image src="/logo.png" alt="Sauron" width={100} height={50} />

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
              Map Center: {currentCenter[1].toFixed(4)}, {currentCenter[0].toFixed(4)}
            </div>
          )}
        </div>

        <FilterAccordion 
          radius={radius}
          onRadiusChange={onRadiusChange}
          showStatic={showStatic}
          onShowStaticChange={onShowStaticChange}
        />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Timeline (Minute)</Label>
          <div className="space-y-2">
            <Slider
              value={[currentMinute]}
              onValueChange={(value) => onCurrentMinuteChange(value[0])}
              min={0}
              max={59}
              step={1}
              className="w-full"
              disabled={!timeRange}
            />
            <div className="text-center text-xs text-muted-foreground font-mono">
              {formattedTime}
            </div>
          </div>
        </div>

      </div>
      
      <Separator className="mt-auto" />
      <div className="flex-1 min-h-0">
        <Chatbot />
      </div>
    </div>
  );
}