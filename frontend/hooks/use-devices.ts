import { useState, useEffect } from 'react';
import { getTrajectories } from '@/lib/api';
import { MapPoint } from '@/types/map';

interface TrajectoryDevice {
  bssid: string;
  firstPoint: {
    lat: number;
    lon: number;
    timestamp: string;
  };
  trajectoryLength: number;
}

interface UseDevices {
  devices: TrajectoryDevice[];
  points: MapPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  pagination: null; // No pagination with trajectory endpoint
}

interface UseDevicesOptions {
  lat?: number; // Center latitude (default: University of Waterloo)
  lon?: number; // Center longitude (default: University of Waterloo)
  radius?: number; // Search radius in meters (default: 5000)
  hoursBack?: number; // How many hours back to fetch data (default: 24)
  enabled?: boolean; // Whether to auto-fetch on mount (default: true)
  isStatic?: boolean; // Whether to filter for static devices only (default: true)
}

export function useDevices({
  lat = 43.4701994, // University of Waterloo
  lon = -80.5452429, // University of Waterloo
  radius = 5000, // 5km radius
  hoursBack = 24, // Last 24 hours
  enabled = true,
  isStatic = true,
}: UseDevicesOptions = {}): UseDevices {
  const [devices, setDevices] = useState<TrajectoryDevice[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate time range (last N hours)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000));
      
      console.log(`Fetching trajectories from backend: area=(${lat}, ${lon}), radius=${radius}m, time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      // Get filtered trajectories in the specified area and time range
      const response = await getTrajectories(lat, lon, radius, startTime, endTime, isStatic);
      
      console.log(`Received ${response.data.length} devices with trajectory data from backend`);
      
      // Process trajectory data and extract first points for the map
      const deviceList: TrajectoryDevice[] = [];
      const mapPoints: MapPoint[] = [];
      
      for (const deviceTrajectory of response.data) {
        if (deviceTrajectory.trajectory && deviceTrajectory.trajectory.length > 0) {
          // Use the first point from the trajectory
          const firstPoint = deviceTrajectory.trajectory[0];
          
          const device: TrajectoryDevice = {
            bssid: deviceTrajectory.bssid,
            firstPoint: firstPoint,
            trajectoryLength: deviceTrajectory.trajectory.length
          };
          
          const mapPoint: MapPoint = {
            id: deviceTrajectory.bssid,
            latitude: firstPoint.lat,
            longitude: firstPoint.lon,
            title: `Device: ${deviceTrajectory.bssid}`,
            description: `BSSID: ${deviceTrajectory.bssid}<br>Trajectory points: ${deviceTrajectory.trajectory.length}<br>First location: ${new Date(firstPoint.timestamp).toLocaleString()}<br>Search area: ${radius}m radius from (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          };
          
          deviceList.push(device);
          mapPoints.push(mapPoint);
        }
      }
      
      console.log(`Successfully processed ${deviceList.length} devices with location data`);
      
      setDevices(deviceList);
      setPoints(mapPoints);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trajectories';
      console.error('Error fetching trajectories:', errorMessage);
      setError(errorMessage);
      setDevices([]);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchDevices();
  };

  useEffect(() => {
    if (enabled) {
      fetchDevices();
    }
  }, [lat, lon, radius, hoursBack, enabled]);

  return {
    devices,
    points,
    loading,
    error,
    refetch,
    pagination: null
  };
}