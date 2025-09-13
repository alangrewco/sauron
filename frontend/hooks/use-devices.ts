import { useState, useEffect } from 'react';
import { getDevices, Device, DevicesResponse } from '@/lib/api';
import { MapPoint } from '@/types/map';

interface UseDevices {
  devices: Device[];
  points: MapPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  pagination: DevicesResponse['pagination'] | null;
}

interface UseDevicesOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean; // Whether to auto-fetch on mount (default: true)
}

export function useDevices({
  limit = 100,
  offset = 0,
  enabled = true
}: UseDevicesOptions = {}): UseDevices {
  const [devices, setDevices] = useState<Device[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<DevicesResponse['pagination'] | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching devices from backend: limit=${limit}, offset=${offset}`);
      
      const response = await getDevices(limit, offset);
      
      console.log(`Received ${response.data.length} devices from backend (total: ${response.pagination.total})`);
      
      setDevices(response.data);
      setPagination(response.pagination);
      
      // Convert devices to map points
      // Since the devices endpoint doesn't return location data, we'll need to get that from trajectories
      // For now, let's create placeholder points or see if we can get location data another way
      const mapPoints: MapPoint[] = response.data.map((device, index) => {
        // Create points around University of Waterloo as placeholders
        // In a real scenario, you'd want to fetch the latest location for each device
        const baseLat = 43.4701994;
        const baseLon = -80.5452429;
        const offsetRange = 0.01; // ~1km offset range
        
        return {
          id: device.bssid,
          latitude: baseLat + (Math.random() - 0.5) * offsetRange,
          longitude: baseLon + (Math.random() - 0.5) * offsetRange,
          title: `Device: ${device.bssid}`,
          description: `BSSID: ${device.bssid}<br>First seen: ${new Date(device.first_seen_at).toLocaleString()}<br>Last seen: ${new Date(device.last_seen_at).toLocaleString()}`,
        };
      });
      
      setPoints(mapPoints);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch devices';
      console.error('Error fetching devices:', errorMessage);
      setError(errorMessage);
      setDevices([]);
      setPoints([]);
      setPagination(null);
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
  }, [limit, offset, enabled]);

  return {
    devices,
    points,
    loading,
    error,
    refetch,
    pagination
  };
}