import ResizableLayout from '@/components/resizable-layout';
import { MapPoint } from '@/types/map';

const samplePoints: MapPoint[] = [
  {
    id: 1,
    latitude: 40.7589,
    longitude: -73.9851,
    title: "Times Square",
    description: "The heart of Manhattan, famous for its bright lights and Broadway theaters."
  },
  {
    id: 2,
    latitude: 40.7614,
    longitude: -73.9776,
    title: "Central Park South",
    description: "Beautiful park area in the center of Manhattan."
  },
  {
    id: 3,
    latitude: 40.7505,
    longitude: -73.9934,
    title: "Chelsea Market",
    description: "Indoor food hall and shopping mall in the Chelsea neighborhood."
  },
  {
    id: 4,
    latitude: 40.7282,
    longitude: -74.0776,
    title: "One World Trade Center",
    description: "The main building of the rebuilt World Trade Center complex."
  }
];

// Note: You'll need to get a Mapbox access token from https://account.mapbox.com/access-tokens/
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your-mapbox-access-token-here';

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <ResizableLayout
          points={samplePoints}
          accessToken={MAPBOX_ACCESS_TOKEN}
        />
      </div>
    </div>
  );
}
