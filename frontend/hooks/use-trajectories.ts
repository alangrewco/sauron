import { useState, useEffect } from 'react';
import { getTrajectories, trajectoryPointsToMapPoints, TrajectoryPoint } from '@/lib/api';
import { MapPoint } from '@/types/map';

interface UseTrajectories {
  points: MapPoint[];
  trajectoryData: TrajectoryPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseTrajectoryOptions {
  lat: number;
  lon: number;
  radius: number;
  hoursBack?: number; // How many hours back to fetch data (default: 24)
  enabled?: boolean; // Whether to auto-fetch on mount (default: true)
}

export function useTrajectories({
  lat,
  lon,
  radius,
  hoursBack = 24,
  enabled = true
}: UseTrajectoryOptions): UseTrajectories {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrajectories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate time range (last N hours)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000));

      console.log(`Fetching trajectories for area: lat=${lat}, lon=${lon}, radius=${radius}m, time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      const response = await getTrajectories(lat, lon, radius, startTime, endTime);
      
      console.log(`Received ${response.data.length} trajectory points from backend`);
      
      setTrajectoryData(response.data);
      const mapPoints = trajectoryPointsToMapPoints(response.data);
      setPoints(mapPoints);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trajectories';
      console.error('Error fetching trajectories:', errorMessage);
      setError(errorMessage);
      setPoints([]); // Clear points on error
      setTrajectoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchTrajectories();
  };

  useEffect(() => {
    if (enabled) {
      fetchTrajectories();
    }
  }, [lat, lon, radius, hoursBack, enabled]);

  return {
    points,
    trajectoryData,
    loading,
    error,
    refetch
  };
}

// Convenience hook specifically for University of Waterloo area
export function useWaterlooTrajectories(options: {
  radius?: number;
  hoursBack?: number;
  enabled?: boolean;
} = {}): UseTrajectories {
  const { radius = 1000, hoursBack = 24, enabled = true } = options;
  
  // University of Waterloo coordinates
  const WATERLOO_LAT = 43.4701994;
  const WATERLOO_LON = -80.5452429;

  return useTrajectories({
    lat: WATERLOO_LAT,
    lon: WATERLOO_LON,
    radius,
    hoursBack,
    enabled
  });
}