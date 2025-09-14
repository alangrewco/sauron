'use client';

import { useState, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import SettingsPanel from '@/components/settings-panel';
import MapBox from '@/components/mapbox';
import { MapPoint } from '@/types/map';

interface ResizableLayoutProps {
  points: MapPoint[];
  accessToken: string;
  isStatic: boolean;
  setIsStatic: (value: boolean) => void;
}

export default function ResizableLayout({ points, accessToken, isStatic, setIsStatic }: ResizableLayoutProps) {
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [currentCenter, setCurrentCenter] = useState<[number, number] | undefined>();

  const handleLocationSelect = useCallback((coordinates: [number, number]) => {
    setMapCenter(coordinates);
    setCurrentCenter(coordinates);
  }, []);

  const handleMapCenterChange = useCallback((center: [number, number]) => {
    setCurrentCenter(center);
  }, []);

  // Remove onStaticChange, not needed for map
  
  return (
    <div className="h-full relative">
      {/* Full-screen background map */}
      <div className="absolute inset-0">
        <MapBox
          points={points}
          center={mapCenter}
          height="100%"
          zoom={12}
          accessToken={accessToken}
          onCenterChange={handleMapCenterChange}
        />
      </div>
      
      {/* Overlaid resizable panels */}
      <div className="absolute inset-0 pointer-events-none">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Settings */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="pointer-events-auto">
            <div className="h-full bg-background/95 backdrop-blur-sm border-r shadow-lg">
              <SettingsPanel 
                accessToken={accessToken}
                onLocationSelect={handleLocationSelect}
                currentCenter={currentCenter}
                isStatic={isStatic}
                setIsStatic={setIsStatic}
              />
            </div>
          </ResizablePanel>
          
          {/* Resizable Handle */}
          <ResizableHandle withHandle className="pointer-events-auto" />
          
          {/* Right Panel - Transparent (map shows through) */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="h-full" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
