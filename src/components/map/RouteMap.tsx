"use client";

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEVStore } from '@/store/useEVStore';
import { useThemeStore } from '@/store/useThemeStore';
import { fetchRoute, fetchChargingStations, fetchRouteWeather } from '@/lib/api';
import { Station } from '@/types';

const RouteMap = React.memo(function RouteMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const telemetryMarkerRef = useRef<maplibregl.Marker | null>(null);

  const { route, setRoute, generateRoutePoints, hoveredDistanceKm, addWaypoint, setToastMessage, setMapInitialized } = useEVStore();
  const { theme } = useThemeStore();
  const stations = route.stations || [];
  const [mapReady, setMapReady] = useState(false);

  const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
  
  // To use your customized 'india' borders map from MapTiler, set its Map ID in the .env file!
  const customLightStyle = process.env.NEXT_PUBLIC_MAPTILER_LIGHT_STYLE || 'streets-v2';
  const customDarkStyle = process.env.NEXT_PUBLIC_MAPTILER_DARK_STYLE || 'dataviz-dark';

  const mapStyle = (t: string) =>
    t === 'light'
      ? `https://api.maptiler.com/maps/${customLightStyle}/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/${customDarkStyle}/style.json?key=${MAPTILER_KEY}`;

  useEffect(() => {
    if (mapRef.current || !mapContainer.current || !MAPTILER_KEY) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle(theme),
      center: [78.9629, 20.5937],
      zoom: 4.5,
      minZoom: 3.8,
      maxBounds: [
        [65.0, 5.0], // Southwest coordinates (Lng, Lat)
        [98.0, 38.0]  // Northeast coordinates (Lng, Lat)
      ],
      attributionControl: false,
    });

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: route.polyline && route.polyline.length > 1 ? [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.polyline as any }
          }] : []
        }
      });

      // MapTiler 3D Terrain
      map.addSource('maptiler-terrain', {
        type: 'raster-dem',
        url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`
      });
      map.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 });

      // Add a hillshade layer beneath roads but above standard basemaps
      map.addLayer({
        id: 'hills',
        type: 'hillshade',
        source: 'maptiler-terrain',
        layout: {},
        paint: {
          'hillshade-exaggeration': 0.6,
          'hillshade-shadow-color': theme === 'light' ? '#334155' : '#0f172a',
          'hillshade-highlight-color': theme === 'light' ? '#ffffff' : '#334155',
        }
      });

      // Glow layer
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme === 'light' ? '#0a8f9e' : '#22d3ee', 'line-width': 12, 'line-opacity': 0.2, 'line-blur': 8 }
      });

      // Main route line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme === 'light' ? '#0a8f9e' : '#22d3ee', 'line-width': 3 }
      });

      setMapReady(true);
      setMapInitialized(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, [MAPTILER_KEY]); // eslint-disable-line

  const lastTheme = useRef(theme);

  // Switch map style when theme toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || lastTheme.current === theme) return;
    
    lastTheme.current = theme;
    map.setStyle(mapStyle(theme));
    
    // Re-add route source/layers after the new style strictly finishes loading and transitioning
    map.once('idle', () => {
      // 1. Restore the 3D Terrain
      if (!map.getSource('maptiler-terrain')) {
        map.addSource('maptiler-terrain', {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`
        });
        map.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 });
          
        if (!map.getLayer('hills')) {
          map.addLayer({
            id: 'hills',
            type: 'hillshade',
            source: 'maptiler-terrain',
            layout: {},
            paint: {
              'hillshade-exaggeration': 0.6,
              'hillshade-shadow-color': theme === 'light' ? '#334155' : '#0f172a',
              'hillshade-highlight-color': theme === 'light' ? '#ffffff' : '#334155',
            }
          });
        }
      }

      // If by some chance the source survived or was already recreated, wipe it to be pristine
      if (map.getLayer('route-glow')) map.removeLayer('route-glow');
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');

      // Inject our calculated EV path geometry
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: route.polyline && route.polyline.length > 1 ? [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.polyline as any }
          }] : []
        }
      });
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme === 'light' ? '#0a8f9e' : '#22d3ee', 'line-width': 12, 'line-opacity': 0.2, 'line-blur': 8 }
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme === 'light' ? '#0a8f9e' : '#22d3ee', 'line-width': 3 }
      });
    });
  }, [theme, mapReady, route.polyline]); // eslint-disable-line

  // Update route when store changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !route.startCoordinates || !route.endCoordinates) return;

    const controller = new AbortController();
    const signal = controller.signal;

    async function update() {
      try {
        const data = await fetchRoute(route.startCoordinates!, route.endCoordinates!, route.waypoints, signal);
        if (!data?.routes?.[0] || !mapRef.current || signal.aborted) return;

        const info = data.routes[0];
        const geojson = info.geometry;

        const src = mapRef.current.getSource('route') as maplibregl.GeoJSONSource;
        src?.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: geojson }]
        });

        const coords: [number, number][] = geojson.coordinates;
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds, { padding: { top: 80, bottom: 280, left: 440, right: 80 } });
        }

        const bbox = bounds.toArray();
        const [st, startTemp, endTemp] = await Promise.all([
          fetchChargingStations(bbox[0][1], bbox[0][0], bbox[1][1], bbox[1][0], geojson.coordinates, signal),
          fetchRouteWeather(route.startCoordinates![1], route.startCoordinates![0], signal),
          fetchRouteWeather(route.endCoordinates![1], route.endCoordinates![0], signal),
        ]);

        if (signal.aborted) return;

        setRoute({ distanceKm: info.distance / 1000, polyline: geojson.coordinates, stations: st });
        generateRoutePoints(startTemp, endTemp);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Route update failed:', err);
        }
      }
    }
    update();
    return () => controller.abort();
  }, [route.startCoordinates, route.endCoordinates, route.waypoints, mapReady, setRoute, generateRoutePoints]);

  // Reset autoWaypointInserted when the user picks a new origin/destination
  useEffect(() => {
    if (route.startCoordinates && route.endCoordinates) {
      setRoute({ autoWaypointInserted: false });
    }
  }, [route.startCoordinates, route.endCoordinates]); // eslint-disable-line

  // ── Range Anxiety Diagnostic ───────────────────────────────────────────────
  useEffect(() => {
    const pts = route.routePoints;
    if (pts.length === 0 || route.autoWaypointInserted || route.stations.length === 0) return;

    const lastBattery = pts[pts.length - 1].predictedBatteryPercent;
    if (lastBattery > 0) return; // Trip is feasible — nothing to do

    // Find the earliest point where battery fell below 15%
    const criticalPoint = pts.find(p => p.predictedBatteryPercent <= 15);
    if (!criticalPoint || !criticalPoint.location) return;

    // Pick the geographically nearest station to the critical point
    const [cLng, cLat] = criticalPoint.location;
    const bestStation = route.stations.reduce((best, st) => {
      const dist = Math.hypot(st.longitude - cLng, st.latitude - cLat);
      const bestDist = Math.hypot(best.longitude - cLng, best.latitude - cLat);
      return dist < bestDist ? st: best;
    });

    // Insert the waypoint and mark the guard so we don't loop
    setRoute({ autoWaypointInserted: true });
    addWaypoint([bestStation.longitude, bestStation.latitude]);
    setToastMessage(`Destination out of reach. Suggested charging stop added at ${bestStation.title}.`);
  }, [route.routePoints]); // eslint-disable-line

  // Render station markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    stations.forEach(station => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 10px; height: 10px;
        background: #16a34a;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.8);
        box-shadow: 0 0 6px rgba(22,163,74,0.5);
        cursor: pointer;
      `;
      if (mapRef.current) {
        // Build popup content safely via DOM to avoid XSS
        const container = document.createElement('div');
        container.style.fontFamily = 'inherit';
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:4px;';
        titleEl.textContent = station.title;
        const addrEl = document.createElement('div');
        addrEl.style.cssText = 'font-size:11px;color:#94a3b8';
        addrEl.textContent = station.address || 'Address unavailable';
        container.appendChild(titleEl);
        container.appendChild(addrEl);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.longitude, station.latitude])
          .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setDOMContent(container))
          .addTo(mapRef.current);
        markersRef.current.push(marker);
      }
    });
  }, [stations]);

  // Telemetry Hover Marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (hoveredDistanceKm === null) {
      if (telemetryMarkerRef.current) {
        telemetryMarkerRef.current.remove();
        telemetryMarkerRef.current = null;
      }
      return;
    }

    const closest = [...route.routePoints].sort((a,b) => Math.abs(a.distanceKm - hoveredDistanceKm) - Math.abs(b.distanceKm - hoveredDistanceKm))[0];
    
    if (closest && closest.location && closest.location[0] !== 0) {
      if (!telemetryMarkerRef.current) {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 16px; height: 16px;
          background-color: #22d3ee;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 15px 3px rgba(34,211,238,0.7);
          pointer-events: none;
          z-index: 9999;
        `;
        telemetryMarkerRef.current = new maplibregl.Marker({ element: el }).addTo(mapRef.current);
      }
      telemetryMarkerRef.current.setLngLat(closest.location);
    }
  }, [hoveredDistanceKm, route.routePoints]);

  if (!MAPTILER_KEY) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0)', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontWeight: 700 }}>MapTiler Key Required</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Set NEXT_PUBLIC_MAPTILER_KEY in .env</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0, willChange: 'transform' }} />
    </div>
  );
});

export default RouteMap;
