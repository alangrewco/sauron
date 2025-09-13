import MapBox from '@/components/mapbox';
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
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        Sauron
      </h1>

      <div className="w-full">
        <MapBox
          points={samplePoints}
          height="500px"
          zoom={12}
          accessToken={MAPBOX_ACCESS_TOKEN}
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Sample Points:</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {samplePoints.map((point) => (
            <div key={point.id} className="p-3 border rounded-lg">
              <h4 className="font-medium">{point.title}</h4>
              <p className="text-sm text-muted-foreground">{point.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lat: {point.latitude}, Lng: {point.longitude}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
