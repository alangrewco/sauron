'use client';

import { useEffect, useState } from 'react';
import ResizableLayout from '@/components/resizable-layout';
import { MapPoint } from '@/types/map';
import { useDevices } from '@/hooks/use-devices';

// Fallback sample points in case backend is not available or returns no data
const fallbackPoints: MapPoint[] = [
  {
    id: 'fallback-1',
    latitude: 43.4701994,
    longitude: -80.5452429,
    title: "University of Waterloo",
    description: "200 University Ave W, Waterloo, ON N2L 3G1 - A leading public research university."
  }
];

// Note: You'll need to get a Mapbox access token from https://account.mapbox.com/access-tokens/
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your-mapbox-access-token-here';

export default function Home() {
  const [isStatic, setIsStatic] = useState(false);
  const { points, devices, loading, error, refetch } = useDevices({ isStatic });

  // Use device points from backend, fallback to sample points if no data
  const displayPoints = points.length > 0 ? points : fallbackPoints;


  useEffect(() => {
    if (error) {
      console.error('Failed to load device data:', error);
    }
  }, [error]);

  return (
    <div className="h-screen flex flex-col">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
          <span>⚠️ Could not load device data from backend: {error}</span>
          <button 
            onClick={refetch}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 text-sm">
          🔄 Loading trajectory data...
        </div>
      )}
      {!loading && !error && devices.length > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm">
          ✅ Loaded {devices.length} devices with trajectory data from backend
        </div>
      )}
      <div className="flex-1">
        <ResizableLayout
          points={displayPoints}
          accessToken={MAPBOX_ACCESS_TOKEN}
          isStatic={isStatic}
          setIsStatic={setIsStatic}
        />
      </div>
    </div>
  );
}