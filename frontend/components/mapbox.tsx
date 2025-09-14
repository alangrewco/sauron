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
  height = '100%',
  accessToken,
  onCenterChange
}: MapBoxProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  mapboxgl.accessToken = accessToken;

  const getMapCenter = (): [number, number] => {
    if (center) return center;
    if (points.length === 0) return [-80.5452429, 43.4701994]; // Waterloo University coordinates
    
    const avgLat = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
    const avgLng = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
    
    return [avgLng, avgLat];
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const initialCenter = getMapCenter();
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: zoom
    });

    map.current.on('style.load', () => {
      if (map.current) {
        map.current.getStyle().layers.forEach((layer) => {
          if (layer.type === 'raster') {
            map.current!.setPaintProperty(layer.id, 'raster-saturation', -1);
          }
        });
        
        const mapCanvas = map.current.getCanvas();
        if (mapCanvas) {
          mapCanvas.style.filter = 'grayscale(100%)';
        }
      }
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Track map center changes
    map.current.on('moveend', () => {
      if (map.current && onCenterChange) {
        const mapCenter = map.current.getCenter();
        onCenterChange([mapCenter.lng, mapCenter.lat]);
      }
    });

    // Report initial center
    if (onCenterChange) {
      const mapCenter = map.current.getCenter();
      onCenterChange([mapCenter.lng, mapCenter.lat]);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [zoom, onCenterChange, points]); // Include onCenterChange

  // Handle center prop changes
  useEffect(() => {
    if (!map.current || !center) return;
    
    map.current.flyTo({
      center: center,
      zoom: zoom,
      duration: 1000 // Smooth transition duration in milliseconds
    });
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    points.forEach((point) => {
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

      const marker = new mapboxgl.Marker({
        color: '#ef4444'
      })
        .setLngLat([point.longitude, point.latitude]);

      if (popupContent) {
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent);
        marker.setPopup(popup);
      }

      marker.addTo(map.current!);
      markers.current.push(marker);
    });

    if (points.length > 1 && !center) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(point => {
        bounds.extend([point.longitude, point.latitude]);
      });
      
      map.current.fitBounds(bounds, {
        padding: { top: 20, bottom: 20, left: 20, right: 20 }
      });
    }
  }, [points, center]);

  return (
    <div 
      ref={mapContainer} 
      className="mapbox-container border shadow-sm"
      style={{ width, height }}
    />
  );
}