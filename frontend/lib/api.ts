import { MapPoint } from '@/types/map';

// Backend API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

export interface TrajectoryPoint {
  bssid: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  altitude?: number;
}

export interface TrajectoryResponse {
  data: TrajectoryPoint[];
}

export interface Device {
  id: string;
  bssid: string;
  first_seen_at: string;
  last_seen_at: string;
}

export interface DevicesResponse {
  data: Device[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    pages: number;
    links: {
      self: string;
      next?: string;
      prev?: string;
    };
  };
}

// Helper function to handle API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Get trajectories in a specific area and time range
export async function getTrajectories(
  lat: number,
  lon: number,
  radius: number,
  startTime: Date,
  endTime: Date
): Promise<TrajectoryResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
  });

  return apiRequest<TrajectoryResponse>(`/trajectories?${params.toString()}`);
}

// Get all devices with pagination
export async function getDevices(limit = 100, offset = 0): Promise<DevicesResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return apiRequest<DevicesResponse>(`/devices?${params.toString()}`);
}

// Get trajectory for a specific device
export async function getDeviceTrajectory(bssid: string): Promise<{ bssid: string; trajectory: TrajectoryPoint[] }> {
  return apiRequest<{ bssid: string; trajectory: TrajectoryPoint[] }>(`/trajectories/${encodeURIComponent(bssid)}`);
}

// Convert trajectory points to map points
export function trajectoryPointsToMapPoints(trajectoryPoints: TrajectoryPoint[]): MapPoint[] {
  return trajectoryPoints.map((point, index) => ({
    id: `${point.bssid}-${index}`,
    latitude: point.latitude,
    longitude: point.longitude,
    title: point.bssid,
    description: `Device: ${point.bssid}<br>Time: ${new Date(point.timestamp).toLocaleString()}${point.altitude ? `<br>Altitude: ${point.altitude}m` : ''}`,
  }));
}