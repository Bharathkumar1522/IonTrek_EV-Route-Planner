import { Station } from '@/types';

const OCM_API_KEY = process.env.NEXT_PUBLIC_OCM_API_KEY || 'sandbox_key'; 

export async function fetchChargingStations(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  routeCoords: [number, number][] = [],
  signal?: AbortSignal
): Promise<Station[]> {
  try {
    const boundingBox = `(${minLat},${minLng}),(${maxLat},${maxLng})`;
    
    const response = await fetch(
      `https://api.openchargemap.io/v3/poi?key=${OCM_API_KEY}&output=json&boundingbox=${boundingBox}&maxresults=50`,
      { signal }
    );

    if (!response.ok) {
      console.warn('Failed to fetch from OpenChargeMap', response.statusText);
      return generateMockStations(routeCoords, minLat, minLng, maxLat, maxLng);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return generateMockStations(routeCoords, minLat, minLng, maxLat, maxLng);
    }
    
    return data
      .filter((poi: any) => 
        poi?.ID != null && 
        poi?.AddressInfo != null && 
        Number.isFinite(poi.AddressInfo.Latitude) && 
        Number.isFinite(poi.AddressInfo.Longitude)
      )
      .map((poi: any) => ({
        id: String(poi.ID),
        title: poi.AddressInfo.Title ?? 'Unknown Station',
        latitude: poi.AddressInfo.Latitude,
        longitude: poi.AddressInfo.Longitude,
        address: poi.AddressInfo.AddressLine1 ?? null,
        connections: poi.Connections ?? [],
      }));

  } catch (error) {
    console.error('Error fetching stations:', error);
    return generateMockStations(routeCoords, minLat, minLng, maxLat, maxLng);
  }
}

function generateMockStations(routeCoords: [number, number][], minLat: number, minLng: number, maxLat: number, maxLng: number): Station[] {
  const stations: Station[] = [];
  const providers = ['Tata Power EZ Charge', 'Zeon Charging', 'ChargeZone', 'Jio-bp pulse', 'Statiq'];
  
  const useRoute = routeCoords.length > 10;
  
  for (let i = 0; i < 4; i++) {
    // Distribute perfectly across the route
    const progress = (i + 1) / 5;
    
    let lat = 0;
    let lng = 0;
    
    if (useRoute) {
      // Find the coordinate index corresponding to the progress percentage along the array
      const index = Math.floor(progress * (routeCoords.length - 1));
      // routeCoords are [lng, lat] from GeoJSON
      lng = routeCoords[index][0];
      lat = routeCoords[index][1];
      
      // Add a tiny random offset so it's slightly off the center of the road
      lat += (Math.random() - 0.5) * 0.005;
      lng += (Math.random() - 0.5) * 0.005;
    } else {
      // Fallback: Interpolate bounds roughly along a diagonal
      lat = minLat + (maxLat - minLat) * progress + (Math.random() * 0.05 - 0.025);
      lng = minLng + (maxLng - minLng) * progress + (Math.random() * 0.05 - 0.025);
    }
    
    stations.push({
      id: `mock-${i}`,
      title: `${providers[i % providers.length]} Station`,
      latitude: lat,
      longitude: lng,
      address: `Highway Plaza ${i+1}, Route Stop`,
      connections: [
        { Level: { ID: 3 }, PowerKW: 60 + Math.floor(Math.random() * 60) },
        { Level: { ID: 2 }, PowerKW: 7.2 }
      ]
    });
  }
  return stations;
}

export async function fetchRoute(start: [number, number], end: [number, number], waypoints: [number, number][] = [], signal?: AbortSignal) {
  try {
    const coordsList = [start, ...waypoints, end];
    const coordsString = coordsList.map(c => `${c[0]},${c[1]}`).join(';');
    
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
      { signal }
    );
    
    if (!response.ok) throw new Error('Failed to fetch route');
    
    return await response.json();
  } catch (error) {
    console.error('Route error:', error);
    return null;
  }
}

// Fetch temperature using Open-Meteo (free API, no key)
export async function fetchRouteWeather(lat: number, lng: number, signal?: AbortSignal): Promise<number> {
  try {
    // We fetch current temperature for a specific coordinate
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m`,
      { signal }
    );
    if (!response.ok) return 25; // fallback to 25C
    const data = await response.json();
    return data.current.temperature_2m ?? 25;
  } catch (error) {
    console.warn('Weather fetch error:', error);
    return 25;
  }
}
