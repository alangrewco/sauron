'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapBoxProps } from '@/types/map';

export default function MapBox({
  points,
  center,
  zoom = 10,
  width = '100%',
  height = '400px',
  accessToken
}: MapBoxProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  // Set the Mapbox access token
  mapboxgl.accessToken = accessToken;

  // Calculate center from points if not provided
  const getMapCenter = (): [number, number] => {
    if (center) return center;
    if (points.length === 0) return [-74.006, 40.7128]; // Default to NYC
    
    const avgLat = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
    const avgLng = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
    
    return [avgLng, avgLat]; // Mapbox uses [lng, lat]
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: getMapCenter(),
      zoom: zoom
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update markers when points change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    points.forEach((point) => {
      // Create popup content if title or description exists
      let popupContent = '';
      if (point.title || point.description) {
        popupContent = `
          <div class="p-2">
            ${point.title ? `<h3 class="font-semibold text-sm mb-1">${point.title}</h3>` : ''}
            ${point.description ? `<p class="text-xs text-gray-600">${point.description}</p>` : ''}
            <p class="text-xs text-gray-500 mt-1">
              ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}
            </p>
          </div>
        `;
      }

      // Create marker
      const marker = new mapboxgl.Marker({
        color: '#ef4444' // Red marker color
      })
        .setLngLat([point.longitude, point.latitude]);

      // Add popup if content exists
      if (popupContent) {
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent);
        marker.setPopup(popup);
      }

      marker.addTo(map.current!);
      markers.current.push(marker);
    });

    // Fit map to markers if there are multiple points
    if (points.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(point => {
        bounds.extend([point.longitude, point.latitude]);
      });
      
      map.current.fitBounds(bounds, {
        padding: { top: 20, bottom: 20, left: 20, right: 20 }
      });
    }
  }, [points]);

  return (
    <div 
      ref={mapContainer} 
      className="mapbox-container rounded-lg border shadow-sm"
      style={{ width, height }}
    />
  );
}