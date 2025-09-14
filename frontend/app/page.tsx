'use client';

import { useState, useEffect, useMemo } from 'react';
import ResizableLayout from '@/components/resizable-layout';
import { MapPoint } from '@/types/map';
import { getMovementTrajectories, getMovementTimeRange, Trajectory } from '@/lib/api';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your-mapbox-access-token-here';

// --- HELPER FUNCTIONS (No Changes) ---
const isStatic = (trajectory: Trajectory) => {
  if (trajectory.trajectory.length <= 1) return true;
  const firstPoint = trajectory.trajectory[0];
  return trajectory.trajectory.every(p => p.lat === firstPoint.lat && p.lon === firstPoint.lon);
};

const generateColorFromBssid = (bssid: string): string => {
  let hash = 0;
  for (let i = 0; i < bssid.length; i++) {
    hash = bssid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 90%, 65%)`;
};

const haversineDistance = (coords1: [number, number], coords2: [number, number]): number => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export default function Home() {
  const [trajectories, setTrajectories] = useState<Trajectory[]>([]);
  const [timeRange, setTimeRange] = useState<{ min: number; max: number } | null>(null);
  const [filterLocation, setFilterLocation] = useState<[number, number] | undefined>();
  const [radius, setRadius] = useState(10);
  const [showStatic, setShowStatic] = useState(true);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- REVISED DATA FETCHING ---
  // This now runs ONCE on mount to get all trajectories from the simulation.
  // The backend will provide all of them if no location is specified.
  useEffect(() => {
    setLoading(true);
    // Fetch time range and all trajectories concurrently for faster loading
    Promise.all([
      getMovementTimeRange(),
      getMovementTrajectories() // No arguments = fetch all
    ]).then(([timeData, trajectoryData]) => {
      if (timeData.start_time && timeData.end_time) {
        const min = new Date(timeData.start_time).getTime();
        const max = new Date(timeData.end_time).getTime();
        setTimeRange({ min, max });
        setCurrentMinute(0);
      }
      setTrajectories(trajectoryData.data);
    }).catch(err => {
      setError(err.message || 'Failed to fetch initial data.');
    }).finally(() => {
      setLoading(false);
    });
  }, []); // Empty dependency array ensures this runs only once.

  
  // --- REVISED LOGIC: ONE CENTRALIZED FILTERING HOOK ---
  const visibleDevices = useMemo(() => {
    // Start with the full, unfiltered list of trajectories
    let baseTrajectories = trajectories;

    // 1. Filter by the "Static" switch
    if (!showStatic) {
      baseTrajectories = baseTrajectories.filter(t => !isStatic(t));
    }
    
    // This check is important for the initial render before timeRange is fetched
    if (!timeRange) return [];
    
    const targetTimestamp = timeRange.min + (currentMinute * 60 * 1000);

    // 2. Process each device to find its current state and apply spatial filtering
    const processed = baseTrajectories.map(t => {
      const currentPoint = t.trajectory
        .slice()
        .reverse()
        .find(p => new Date(p.timestamp).getTime() <= targetTimestamp);

      if (!currentPoint) return null;

      // **THIS IS THE CRITICAL FIX**:
      // If a filterLocation IS set, we perform the distance check.
      // If the device's current point is outside the radius, we discard it.
      if (filterLocation) {
        const distance = haversineDistance(filterLocation, [currentPoint.lon, currentPoint.lat]);
        if (distance > radius) {
          return null;
        }
      }

      const visiblePath = t.trajectory.filter(p => new Date(p.timestamp).getTime() <= targetTimestamp);

      return {
        id: t.bssid,
        color: generateColorFromBssid(t.bssid),
        currentPoint: currentPoint,
        visiblePath: visiblePath,
      };
    });

    return processed.filter(Boolean);

  }, [trajectories, showStatic, currentMinute, timeRange, filterLocation, radius]);


  // --- Data derivation for map props (No Changes Here) ---
  const trajectoriesForMap = useMemo(() => {
    return visibleDevices.map(d => ({
      bssid: d.id,
      color: d.color,
      trajectory: d.visiblePath,
    }));
  }, [visibleDevices]);

  const displayPoints = useMemo<MapPoint[]>(() => {
    return visibleDevices.map(d => ({
      id: d.id,
      latitude: d.currentPoint.lat,
      longitude: d.currentPoint.lon,
      title: `Device: ${d.id}`,
      description: `Time: ${new Date(d.currentPoint.timestamp).toLocaleString()}`,
    }));
  }, [visibleDevices]);

  return (
    <div className="h-dvh flex flex-col">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm z-50">
          <span>⚠️ {error}</span>
        </div>
      )}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 text-sm z-50">
          🔄 Loading movement data...
        </div>
      )}
      <div className="flex-1">
        <ResizableLayout
          points={displayPoints}
          trajectoriesWithStyle={trajectoriesForMap}
          accessToken={MAPBOX_ACCESS_TOKEN}
          radius={radius}
          onRadiusChange={setRadius}
          showStatic={showStatic}
          onShowStaticChange={setShowStatic}
          filterLocation={filterLocation}
          onLocationSelect={setFilterLocation}
          timeRange={timeRange}
          currentMinute={currentMinute}
          onCurrentMinuteChange={setCurrentMinute}
        />
      </div>
    </div>
  );
}