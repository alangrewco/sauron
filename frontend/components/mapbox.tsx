'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapBoxProps } from '@/types/map';
import { Trajectory } from '@/lib/api';

interface TrajectoryWithStyle extends Trajectory {
  color: string;
}

interface ExtendedMapBoxProps extends MapBoxProps {
  trajectories: TrajectoryWithStyle[];
  radius: number;
  filterLocation?: [number, number];
}

export default function MapBox({
  points,
  trajectories,
  center,
  radius,
  filterLocation,
  zoom = 10,
  width = '100%',
  height = '100%',
  accessToken,
  onCenterChange
}: ExtendedMapBoxProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [initialFitDone, setInitialFitDone] = useState(false);

  mapboxgl.accessToken = accessToken;

  // Effect for initializing the map (runs once)
  useEffect(() => {
    if (!mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-80.54, 43.47],
      zoom: zoom
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.on('moveend', () => {
      if (map.current && onCenterChange) {
        const mapCenter = map.current.getCenter();
        onCenterChange([mapCenter.lng, mapCenter.lat]);
      }
    });
    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (!map.current || !center) return;
    map.current.flyTo({ center: center, zoom: 14, duration: 1000 });
  }, [center]);

  // --- NEW: Effect for drawing the radius circle ---
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const sourceId = 'radius-circle';
    const source = map.current.getSource(sourceId);

    if (filterLocation) {
      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: filterLocation },
          properties: {},
        }],
      };

      if (source) {
        (source as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: 'radius-circle-fill',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, radius * 1000] // Convert km to meters at zoom level 20
              ],
              base: 2
            },
            'circle-color': '#7c3aed', // A nice purple
            'circle-opacity': 0.2
          }
        });
        map.current.addLayer({
          id: 'radius-circle-outline',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, radius * 1000]
              ],
              base: 2
            },
            'circle-stroke-color': '#a78bfa',
            'circle-stroke-width': 2,
            'circle-color': 'transparent' // Make the inside transparent
          }
        });
      }
      
      // Update the radius paint property directly when the slider changes
      map.current.setPaintProperty('radius-circle-fill', 'circle-radius', { stops: [[0, 0], [20, radius * 1000]], base: 2 });
      map.current.setPaintProperty('radius-circle-outline', 'circle-radius', { stops: [[0, 0], [20, radius * 1000]], base: 2 });

    } else if (source) {
      // If there's no location, remove the circle by clearing the source
      (source as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
    }
  }, [filterLocation, radius]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const sourceId = 'trajectory-paths';
    const geojson = { type: 'FeatureCollection', features: trajectories.filter(t => t.trajectory.length > 1).map(t => ({ type: 'Feature', properties: { color: t.color }, geometry: { type: 'LineString', coordinates: t.trajectory.map(p => [p.lon, p.lat]) } })) };
    const source = map.current.getSource(sourceId);
    if (source) { (source as mapboxgl.GeoJSONSource).setData(geojson); }
    else {
      map.current.addSource(sourceId, { type: 'geojson', data: geojson });
      map.current.addLayer({ id: 'trajectory-lines', type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.8 } });
    }
  }, [trajectories]);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    points.forEach((point) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      const popupContent = `<div class="p-1"><h3 class="font-semibold text-sm">${point.title}</h3><p class="text-xs text-gray-400">${point.description}</p></div>`;
      const marker = new mapboxgl.Marker(el).setLngLat([point.longitude, point.latitude]).setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupContent)).addTo(map.current!);
      markers.current.push(marker);
    });
    if (points.length > 1 && !initialFitDone && !center) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(point => { bounds.extend([point.longitude, point.latitude]); });
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
      setInitialFitDone(true);
    }
  }, [points, initialFitDone, center]);

  return ( <div ref={mapContainer} className="mapbox-container" style={{ width, height }} /> );
}