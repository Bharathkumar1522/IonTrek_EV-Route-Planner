export interface EVModel {
  id: string;
  name: string;
  batteryCapacitykWh: number;
  baseRangeKm: number;
}

export interface RouteState {
  startCoordinates: [number, number] | null; // [lng, lat]
  endCoordinates: [number, number] | null;
  waypoints: [number, number][]; // optional intermediate stops
  autoWaypointInserted: boolean; // guard: prevents infinite re-routing loops
  distanceKm: number;
  polyline: number[][] | string | null; // GeoJSON coordinates or encoded polyline
  routePoints: RoutePoint[];
  stations: Station[];
}

export interface RoutePoint {
  distanceKm: number;
  elevationMeters: number;
  temperatureC: number;
  predictedBatteryPercent: number;
  location: [number, number] | null; // [lng, lat]
}

export interface EnvironmentVariables {
  acStatus: boolean;
  passengerWeight: number; // extra weight in kg
  rangeMode: 'arai' | 'real'; // whether to apply extreme realistic penalty discounting
}

export interface ChargerConnection {
  Level?: { ID: number };
  PowerKW?: number;
}

export interface Station {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  address: string;
  connections: ChargerConnection[];
}
