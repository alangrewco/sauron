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
  accessToken
}: MapBoxProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  mapboxgl.accessToken = accessToken;

  const getMapCenter = (): [number, number] => {
    if (center) return center;
    if (points.length === 0) return [-74.006, 40.7128];
    
    const avgLat = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
    const avgLng = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
    
    return [avgLng, avgLat];
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: getMapCenter(),
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

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

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
      className="mapbox-container border shadow-sm"
      style={{ width, height }}
    />
  );
}