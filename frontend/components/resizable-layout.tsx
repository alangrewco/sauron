'use client';

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import SettingsPanel from '@/components/settings-panel';
import MapBox from '@/components/mapbox';
import { MapPoint } from '@/types/map';

interface ResizableLayoutProps {
  points: MapPoint[];
  accessToken: string;
}

export default function ResizableLayout({ points, accessToken }: ResizableLayoutProps) {
  return (
    <div className="h-full relative">
      {/* Full-screen background map */}
      <div className="absolute inset-0">
        <MapBox
          points={points}
          height="100%"
          zoom={12}
          accessToken={accessToken}
        />
      </div>
      
      {/* Overlaid resizable panels */}
      <div className="absolute inset-0 pointer-events-none">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Settings */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="pointer-events-auto">
            <div className="h-full bg-background/95 backdrop-blur-sm border-r shadow-lg">
              <SettingsPanel />
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
