export interface MapPoint {
  id?: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

export interface MapBoxProps {
  points: MapPoint[];
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  width?: string;
  height?: string;
  accessToken: string;
  onCenterChange?: (center: [number, number]) => void;
}
