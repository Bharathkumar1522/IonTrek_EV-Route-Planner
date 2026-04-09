import { create } from 'zustand';
import { EVModel, RouteState, EnvironmentVariables, Station, RoutePoint } from '@/types';

// Expanded list of popular EVs in India
export const INDIA_EVS: EVModel[] = [
  { id: 'tata-tiago-mr', name: 'Tata Tiago EV (Medium Range)', batteryCapacitykWh: 19.2, baseRangeKm: 250 },
  { id: 'tata-tiago-lr', name: 'Tata Tiago EV (Long Range)', batteryCapacitykWh: 24.0, baseRangeKm: 315 },
  { id: 'tata-punch-mr', name: 'Tata Punch EV (Medium Range)', batteryCapacitykWh: 25.0, baseRangeKm: 315 },
  { id: 'tata-punch-lr', name: 'Tata Punch EV (Long Range)', batteryCapacitykWh: 35.0, baseRangeKm: 421 },
  { id: 'tata-nexon-mr', name: 'Tata Nexon EV (Medium Range)', batteryCapacitykWh: 30.0, baseRangeKm: 325 },
  { id: 'tata-nexon-lr', name: 'Tata Nexon EV (Long Range)', batteryCapacitykWh: 40.5, baseRangeKm: 465 },
  { id: 'tata-curvv-45', name: 'Tata Curvv EV (45)', batteryCapacitykWh: 45.0, baseRangeKm: 502 },
  { id: 'tata-curvv-55', name: 'Tata Curvv EV (55)', batteryCapacitykWh: 55.0, baseRangeKm: 585 },
  { id: 'mg-comet', name: 'MG Comet EV', batteryCapacitykWh: 17.3, baseRangeKm: 230 },
  { id: 'mg-zs', name: 'MG ZS EV', batteryCapacitykWh: 50.3, baseRangeKm: 461 },
  { id: 'mahindra-xuv400-34', name: 'Mahindra XUV400 (34.5)', batteryCapacitykWh: 34.5, baseRangeKm: 375 },
  { id: 'mahindra-xuv400-39', name: 'Mahindra XUV400 (39.4)', batteryCapacitykWh: 39.4, baseRangeKm: 456 },
  { id: 'byd-atto3-50', name: 'BYD Atto 3 (Standard)', batteryCapacitykWh: 50.0, baseRangeKm: 410 },
  { id: 'byd-atto3-60', name: 'BYD Atto 3 (Extended)', batteryCapacitykWh: 60.48, baseRangeKm: 521 },
  { id: 'hyundai-ioniq5', name: 'Hyundai IONIQ 5', batteryCapacitykWh: 72.6, baseRangeKm: 631 },
  { id: 'kia-ev6', name: 'Kia EV6', batteryCapacitykWh: 77.4, baseRangeKm: 708 },
];

export const getEVTypeInfo = (id: string) => {
  if (id.includes('mg-comet')) return { color: '#8b5cf6', type: 'Compact Hatchback · Electric' };
  if (id.includes('tiago')) return { color: '#0ea5e9', type: 'Hatchback · Electric' };
  if (id.includes('nexon') || id.includes('punch') || id.includes('xuv400')) return { color: '#0a8f9e', type: 'Compact SUV · Electric' };
  if (id.includes('curvv') || id.includes('zs') || id.includes('atto3')) return { color: '#ca8a04', type: 'SUV · Electric' };
  return { color: '#10b981', type: 'Premium Crossover · Electric' };
};

interface EVStore {
  // EV State
  models: EVModel[];
  selectedEV: EVModel;
  selectEV: (id: string) => void;

  // Environment State
  environment: EnvironmentVariables;
  setEnvironment: (env: Partial<EnvironmentVariables>) => void;

  // Route State
  route: RouteState;
  setRoute: (routeUpdate: Partial<RouteState>) => void;
  generateRoutePoints: (startTemp: number, endTemp: number) => void;

  // Derived Values
  calculateRangeAtTemp: (tempC: number) => number;

  // Interactivity State
  hoveredDistanceKm: number | null;
  setHoveredDistanceKm: (dist: number | null) => void;
  addWaypoint: (coords: [number, number]) => void;

  // Toast / Notification
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;

  // App initialization signal
  mapInitialized: boolean;
  setMapInitialized: (val: boolean) => void;
}

export const useEVStore = create<EVStore>((set, get) => ({
  models: INDIA_EVS,
  selectedEV: INDIA_EVS[5], // Default to Nexon EV LR
  selectEV: (id) => set((state) => {
    const nextEV = state.models.find(m => m.id === id) || state.selectedEV;
    return { selectedEV: nextEV };
  }),

  environment: {
    acStatus: false,
    passengerWeight: 0,
    rangeMode: 'real',
  },
  setEnvironment: (env) => {
    set((state) => ({ environment: { ...state.environment, ...env } }));
    // If environment conditions change (like AC or weight), recalculate the active route points immediately
    const state = get();
    if (state.route.routePoints.length > 0) {
      // Re-trigger calculation with existing start/end temps
      const startTemp = state.route.routePoints[0].temperatureC;
      const endTemp = state.route.routePoints[state.route.routePoints.length - 1].temperatureC;
      state.generateRoutePoints(startTemp, endTemp);
    }
  },

  route: {
    startCoordinates: null,
    endCoordinates: null,
    waypoints: [],
    autoWaypointInserted: false,
    distanceKm: 0,
    polyline: null,
    routePoints: [],
    stations: [],
  },
  setRoute: (routeUpdate) => set((state) => ({
    route: { ...state.route, ...routeUpdate }
  })),

  hoveredDistanceKm: null,
  setHoveredDistanceKm: (dist) => set({ hoveredDistanceKm: dist }),

  addWaypoint: (coords) => set((state) => ({
    route: { ...state.route, waypoints: [...state.route.waypoints, coords] }
  })),

  toastMessage: null,
  setToastMessage: (msg) => set({ toastMessage: msg }),

  mapInitialized: false,
  setMapInitialized: (val) => set({ mapInitialized: val }),

  calculateRangeAtTemp: (tempC: number) => {
    const { selectedEV, environment } = get();
    let range = selectedEV.baseRangeKm;

    // 0. Base Real-World Haircut
    if (environment.rangeMode === 'real') {
      range *= 0.70; // Map factory tests down to daily expectations
    }

    // 1. Temperature Penalty (varies along route)
    if (tempC < 10) {
      const diff = 10 - tempC;
      range -= range * (diff * 0.01);
    } else if (tempC > 40) {
      const diff = tempC - 40;
      range -= range * (diff * 0.005);
    }

    // 2. AC Penalty
    if (environment.acStatus) {
      range -= range * 0.12; 
    }

    // 3. Passenger Weight Penalty
    if (environment.passengerWeight > 0) {
      const extraWeightFactor = Math.floor(environment.passengerWeight / 50);
      range -= range * (extraWeightFactor * 0.01);
    }

    return Math.max(0, parseFloat(range.toFixed(2)));
  },

  // Generate 60 route points interpolating distance, elevation, and live temperature gradient
  generateRoutePoints: (startTemp: number, endTemp: number) => {
    const state = get();
    if (state.route.distanceKm === 0) return;

    const numPoints = 60;
    const points: RoutePoint[] = [];

    // Track total battery consumed so far
    let remainingPercent = 100;
    const segmentDistance = state.route.distanceKm / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;
      const distance = progress * state.route.distanceKm;
      
      // Interpolate temp
      const currentTemp = startTemp + (endTemp - startTemp) * progress;
      
      // Simulated elevation profile (hills in middle)
      const elevationMeters = Math.max(0,
        220 + Math.sin(progress * Math.PI * 5) * 120 + Math.cos(progress * Math.PI * 2.5) * 60
      );

      // We calculate battery drain for the PREVIOUS segment and subtract it
      if (i > 0) {
        // Find capacity at this specific temperature
        const rangeAtCurrentTemp = state.calculateRangeAtTemp(currentTemp);
        // Guard against zero/negative range to avoid Infinity/NaN
        const segmentDrainPercent = rangeAtCurrentTemp > 0
          ? (segmentDistance / rangeAtCurrentTemp) * 100
          : 100; // treat as full drain if range is somehow zero
        
        // Add a harsh elevation penalty for steep climbing
        const prevElev = points[i-1].elevationMeters;
        const elevDiff = elevationMeters - prevElev;
        let elevPenalty = 0;
        
        // Dramatically increased algorithmic realism gravity variables
        if (elevDiff > 0) {
           // E.g., climbing 50m drains ~1.75% chunk instantly
           elevPenalty = elevDiff * 0.035;
        } else if (elevDiff < 0) {
           // Regenerative braking recovers a tiny bit of health on descent
           elevPenalty = elevDiff * 0.015; 
        }

        remainingPercent -= (segmentDrainPercent + elevPenalty);
        // Securely clamp physics bounds naturally capped by BMS limits
        remainingPercent = Math.max(0, Math.min(100, remainingPercent));
      }

      // Accurately map real coordinates using the raw polyline geometry from OSRM
      let mappedCoords: [number, number] | null = null;
      if (state.route.polyline && Array.isArray(state.route.polyline) && state.route.polyline.length > 0) {
        const polyLen = state.route.polyline.length;
        const index = Math.min(Math.floor(progress * polyLen), polyLen - 1);
        mappedCoords = state.route.polyline[index] as [number, number];
      }

      points.push({
        distanceKm: parseFloat(distance.toFixed(1)),
        elevationMeters: Math.floor(elevationMeters),
        temperatureC: Math.round(currentTemp),
        predictedBatteryPercent: parseFloat(Math.max(0, remainingPercent).toFixed(1)),
        location: mappedCoords,
      });
    }

    set((state) => ({
      route: { ...state.route, routePoints: points }
    }));
  }

}));
