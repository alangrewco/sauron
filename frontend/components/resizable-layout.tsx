'use client';

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import SettingsPanel from '@/components/settings-panel';
import MapBox from '@/components/mapbox';
import { MapPoint } from '@/types/map';
import { Trajectory } from '@/lib/api';

interface TrajectoryWithStyle extends Trajectory {
  color: string;
}

interface ResizableLayoutProps {
  points: MapPoint[];
  trajectoriesWithStyle: TrajectoryWithStyle[];
  accessToken: string;
  radius: number;
  onRadiusChange: (radius: number) => void;
  showStatic: boolean;
  onShowStaticChange: (show: boolean) => void;
  filterLocation?: [number, number]; // Add this prop
  onLocationSelect: (coordinates: [number, number]) => void;
  timeRange: { min: number, max: number } | null;
  currentMinute: number;
  onCurrentMinuteChange: (minute: number) => void;
}

export default function ResizableLayout({ 
  points, 
  trajectoriesWithStyle,
  accessToken,
  radius,
  onRadiusChange,
  showStatic,
  onShowStaticChange,
  filterLocation, // Destructure
  onLocationSelect,
  timeRange,
  currentMinute,
  onCurrentMinuteChange
}: ResizableLayoutProps) {
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [currentCenter, setCurrentCenter] = useState<[number, number] | undefined>();

  const handleLocationSelect = (coordinates: [number, number]) => {
    setMapCenter(coordinates);
    setCurrentCenter(coordinates);
    onLocationSelect(coordinates);
  };

  const handleMapCenterChange = (center: [number, number]) => {
    setCurrentCenter(center);
  };

  return (
    <div className="h-full relative">
      <div className="absolute inset-0">
        <MapBox
          points={points}
          trajectories={trajectoriesWithStyle}
          center={mapCenter}
          radius={radius} // Pass radius
          filterLocation={filterLocation} // Pass location
          height="100%"
          zoom={12}
          accessToken={accessToken}
          onCenterChange={handleMapCenterChange}
        />
      </div>
      
      <div className="absolute inset-0 pointer-events-none">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="pointer-events-auto">
            <div className="h-full bg-background/95 backdrop-blur-sm border-r shadow-lg">
              <SettingsPanel 
                accessToken={accessToken}
                onLocationSelect={handleLocationSelect}
                currentCenter={currentCenter}
                radius={radius}
                onRadiusChange={onRadiusChange}
                showStatic={showStatic}
                onShowStaticChange={onShowStaticChange}
                timeRange={timeRange}
                currentMinute={currentMinute}
                onCurrentMinuteChange={onCurrentMinuteChange}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="pointer-events-auto" />
          
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="h-full" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}