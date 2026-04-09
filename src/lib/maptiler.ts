import * as maptilerClient from '@maptiler/client';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
if (MAPTILER_KEY) {
  maptilerClient.config.apiKey = MAPTILER_KEY;
}

export interface LocationFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [longitude, latitude]
}

export async function searchLocations(query: string): Promise<LocationFeature[]> {
  const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
  if (!query || !MAPTILER_KEY) return [];
  
  // Set config right before call to guarantee availability in Edge/Next contexts
  maptilerClient.config.apiKey = MAPTILER_KEY;
  
  try {
    const result = await maptilerClient.geocoding.forward(query, {
      country: ['IN'], // Limit search to India initially, matching our EV focus
      limit: 5,
    });
    
    // Map the feature object to our interface
    return result.features.map((f: any) => ({
      id: f.id as string,
      place_name: f.place_name as string,
      text: f.text as string,
      center: f.center as [number, number],
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}
