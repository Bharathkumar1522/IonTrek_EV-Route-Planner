import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IonTrek - EV Planner',
    short_name: 'IonTrek',
    description: 'Advanced EV route planning with live temperature telemetry and charger mapping.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617', // Dark slate
    theme_color: '#0891b2', // Cyan / Accent
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
