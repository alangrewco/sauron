import ResizableLayout from '@/components/resizable-layout';
import { MapPoint } from '@/types/map';

const samplePoints: MapPoint[] = [
  {
    id: 1,
    latitude: 43.4701994,
    longitude: -80.5452429,
    title: "University of Waterloo",
    description: "200 University Ave W, Waterloo, ON N2L 3G1 - A leading public research university."
  },
  {
    id: 2,
    latitude: 43.4643,
    longitude: -80.5204,
    title: "Waterloo Park",
    description: "Beautiful urban park in central Waterloo with trails and recreational facilities."
  },
  {
    id: 3,
    latitude: 43.4723,
    longitude: -80.5449,
    title: "Conestoga Mall",
    description: "Major shopping center serving the Waterloo region."
  },
  {
    id: 4,
    latitude: 43.4668,
    longitude: -80.5164,
    title: "Uptown Waterloo",
    description: "Historic downtown core with shops, restaurants, and entertainment venues."
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
