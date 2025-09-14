// Backend API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

// Represents one point in a device's history
export interface TrajectoryPoint {
  lat: number;
  lon: number;
  timestamp: string;
}

// Represents the full path for a single device
export interface Trajectory {
  bssid: string;
  trajectory: TrajectoryPoint[];
}

export interface MovementTrajectoriesResponse {
  data: Trajectory[];
}

export interface TimeRangeResponse {
  start_time: string | null;
  end_time: string | null;
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

// Get movement trajectories, with optional filtering by area
export async function getMovementTrajectories(
  lat?: number,
  lon?: number,
  radius?: number,
): Promise<MovementTrajectoriesResponse> {
  const params = new URLSearchParams();
  if (lat && lon && radius) {
    params.set('lat', lat.toString());
    params.set('lon', lon.toString());
    params.set('radius', (radius * 1000).toString()); // Convert km to meters for backend
  }
  return apiRequest<MovementTrajectoriesResponse>(`/movement/trajectories?${params.toString()}`);
}

// Get the simulation time range for the timeline scrubber
export async function getMovementTimeRange(): Promise<TimeRangeResponse> {
  return apiRequest<TimeRangeResponse>('/movement/time-range');
}

// Get all devices with pagination (no changes, but kept for reference)
export async function getDevices(limit = 100, offset = 0): Promise<DevicesResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return apiRequest<DevicesResponse>(`/devices?${params.toString()}`);
}