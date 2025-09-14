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

        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Sauron" width={50} height={25} />
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            Sauron
          </h1>
        </div>

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
          timeRange={timeRange}
          currentMinute={currentMinute}
          onCurrentMinuteChange={onCurrentMinuteChange}
          formattedTime={formattedTime}
        />

      </div>

      <Separator className="mt-auto" />
      <div className="flex-1 min-h-0">
        <Chatbot />
      </div>
    </div>
  );
}