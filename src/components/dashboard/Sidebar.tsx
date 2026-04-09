"use client";

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useEVStore, getEVTypeInfo } from '@/store/useEVStore';
import { useThemeStore } from '@/store/useThemeStore';
import {
  Thermometer, Wind, Weight, ChevronDown, Zap, Car,
  AlertTriangle, CheckCircle2, Sun, Moon, MapPin, BatteryCharging, Navigation
} from 'lucide-react';
import LocationSearch from './LocationSearch';
import VehicleSearch from './VehicleSearch';
import { LocationFeature } from '@/lib/maptiler';
import { useHaptic } from '@/lib/useHaptic';
import Image from 'next/image';

const DrainChart = lazy(() => import('@/components/chart/DrainChart'));

function ChartFallback() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: 12,
    }}>
      Loading telemetry…
    </div>
  );
}

const Sidebar = React.memo(function Sidebar() {
  const { selectedEV, environment, setEnvironment, route, setRoute, calculateRangeAtTemp, addWaypoint } = useEVStore();
  const { theme, toggleTheme } = useThemeStore();
  const { tick, light, medium, success } = useHaptic();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'planner' | 'stations'>('planner');

  const [startLoc, setStartLoc] = useState<LocationFeature | null>(null);
  const [endLoc, setEndLoc] = useState<LocationFeature | null>(null);

  // Scroll hint — hide once user has scrolled near the bottom
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const handleBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setShowScrollHint(el.scrollTop + el.clientHeight < el.scrollHeight - 32);
  }, []);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    handleBodyScroll();
    el.addEventListener('scroll', handleBodyScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleBodyScroll);
  }, [handleBodyScroll]);

  useEffect(() => {
    if (startLoc && endLoc) {
      setRoute({ startCoordinates: startLoc.center, endCoordinates: endLoc.center, waypoints: [], distanceKm: 0 });
    }
  }, [startLoc, endLoc, setRoute]);

  // Use average temp of the route if available, otherwise assume 25C optimal
  const avgTemp = React.useMemo(() => {
    return route.routePoints.length > 0
      ? Math.round(route.routePoints.reduce((acc, p) => acc + p.temperatureC, 0) / route.routePoints.length)
      : 25;
  }, [route.routePoints]);

  const remainingRange = calculateRangeAtTemp(avgTemp);
  const baseRange = selectedEV.baseRangeKm;
  const displayBase = environment.rangeMode === 'real' ? Math.round(baseRange * 0.70) : baseRange;
  
  const rangePercent = displayBase > 0 ? Math.min(100, Math.round((remainingRange / displayBase) * 100)) : 0;
  const lostRange = displayBase - remainingRange;

  const ringColor = rangePercent > 30 ? 'var(--success)' : rangePercent > 15 ? 'var(--warning)' : 'var(--danger)';
  const ringR = 46;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - rangePercent / 100);

  // Penalty breakdown
  const tempPenalty = avgTemp < 10
    ? Math.round((10 - avgTemp) * 1) + '%'
    : avgTemp > 40
    ? Math.round((avgTemp - 40) * 0.5) + '%'
    : null;
  const acPenalty = environment.acStatus ? '12%' : null;
  const weightPenalty = environment.passengerWeight > 0
    ? Math.round(Math.floor(environment.passengerWeight / 50)) + '%'
    : null;

  const anyPenalty = tempPenalty || acPenalty || weightPenalty;

  const routeSet = !!(startLoc && endLoc);
  const hasDistance = route.distanceKm > 0;
  const canComplete = hasDistance ? remainingRange >= route.distanceKm : null;

  return (
    <div className="sidebar-panel glass-panel">

      {/* ─── HEADER ─── */}
      <div className="sidebar-header flex-col items-stretch gap-4 pb-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-[11px]">
            <div className="logo-mark relative overflow-hidden">
              <Image src="/logo.png" alt="IonTrek Logo" priority sizes="38px" fill style={{ objectFit: 'cover' }} className="rounded-[10px] scale-110" />
            </div>
            <div>
              <div className="logo-text">IonTrek</div>
              <div className="logo-sub">EV Trip Planner</div>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={() => { tick(); toggleTheme(); }}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{ color: isLight ? 'var(--accent)' : 'var(--warning)' }}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>

        {/* ─── TABS ─── */}
        <div className="flex rounded-[10px] p-1 bg-[var(--surface-2)] border border-[var(--border-subtle)] mt-1 mb-4">
          <button
            onClick={() => { tick(); setActiveTab('planner'); }}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-[6px] transition-all ${
              activeTab === 'planner'
                ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Trip Planner
          </button>
          <button
            onClick={() => { tick(); setActiveTab('stations'); }}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'stations'
                ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <BatteryCharging size={13} />
            Chargers {route.stations?.length > 0 && `(${route.stations.length})`}
          </button>
        </div>
      </div>

      {/* ─── SCROLLABLE BODY ─── */}
      <div className="sidebar-body pb-6 relative" ref={bodyRef} onScroll={handleBodyScroll}>
        
        {activeTab === 'planner' ? (
          <>
            {/* ══ ROUTE ══ */}
            <div className="sidebar-section" style={{ zIndex: 50 }}>
              <div className="mb-[14px]">
                <div className="section-title">Plan Your Route</div>
                <div className="section-subtitle">Search cities or landmarks</div>
              </div>

              <div className="route-connector">
                <div className="route-connector-dots">
                  <div className="route-dot route-dot--start" />
                  <div className="route-line" />
                  <div className="route-dot route-dot--end" />
                </div>
                <div className="route-fields">
                  <div>
                    <div className="section-label" style={{ marginBottom: 5, color: 'var(--accent)' }}>Origin</div>
                    <LocationSearch placeholder="e.g. Delhi, Bangalore, Pune…" onSelect={setStartLoc} />
                  </div>
                  <div>
                    <div className="section-label" style={{ marginBottom: 5, color: 'var(--danger)' }}>Destination</div>
                    <LocationSearch placeholder="e.g. Mumbai, Hyderabad…" onSelect={setEndLoc} />
                  </div>
                </div>
              </div>

              {/* Route Status */}
              {routeSet && (
                <div
                  className={`status-pill mt-[12px] w-full justify-center text-[11px] ${hasDistance ? 'status-pill--success' : 'status-pill--accent'}`}
                >
                  {hasDistance ? (
                    <>
                      <CheckCircle2 size={12} />
                      <span>{startLoc?.text} → {endLoc?.text} · {route.distanceKm.toFixed(0)} km</span>
                    </>
                  ) : (
                    <>
                      <div className="w-[10px] h-[10px] border-[2px] border-current border-t-transparent rounded-full animate-spin" />
                      <span>Calculating Route & Live Weather…</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ══ VEHICLE SEARCH ══ */}
            <div className="sidebar-section" style={{ zIndex: 40 }}>
              <VehicleSearch />
            </div>

            {/* ══ LIVE CONDITIONS ══ */}
            <div className="sidebar-section">
              <div className="mb-[14px]">
                <div className="section-title">Trip Conditions</div>
                <div className="section-subtitle">Auto Weather & Cargo Impacts</div>
              </div>

              <div className="flex flex-col gap-[10px]">
                
                {/* Live Temperature Banner (Replaced Manual Slider) */}
                <div className="control-card active flex items-center justify-between">
                  <div className="control-label">
                    <div className="control-icon" style={{ background: 'var(--accent-subtle)' }}>
                      <Thermometer size={15} color="var(--accent)" />
                    </div>
                    <div className="control-text">
                      <h4>Live Weather Linked</h4>
                      <p className="text-[var(--accent)]">Auto-syncing temps along route</p>
                    </div>
                  </div>
                  <div className="value-badge" style={{
                    color: 'var(--accent)', background: 'var(--accent-subtle)', border: `1px solid var(--accent-border)`,
                  }}>
                    {hasDistance ? `~${avgTemp}°C` : 'Auto'}
                  </div>
                </div>

                {/* Payload */}
                <div className="control-card">
                  <div className="control-row mb-[10px]">
                    <div className="control-label">
                      <div className="control-icon" style={{ background: 'var(--success-subtle)' }}>
                        <Weight size={15} color="var(--success)" />
                      </div>
                      <div className="control-text">
                        <h4>Passengers & Cargo</h4>
                        <p>Extra weight reduces range</p>
                      </div>
                    </div>
                    <div className="value-badge" style={{
                      color: 'var(--success)', background: 'var(--success-subtle)', border: `1px solid var(--success-border)`,
                    }}>
                      +{environment.passengerWeight} kg
                    </div>
                  </div>
                  <input type="range" min="0" max="300" step="10" value={environment.passengerWeight}
                    onChange={(e) => { tick(); setEnvironment({ passengerWeight: parseInt(e.target.value) }); }}
                    style={{ width: '100%', accentColor: 'var(--success)' }}
                  />
                  <div className="slider-labels">
                    <span className="slider-label">0 kg Solo</span>
                    <span className="slider-label">300 kg Full load</span>
                  </div>
                </div>

                {/* AC Toggle */}
                <div className={`control-card ${environment.acStatus ? 'active' : ''}`}>
                  <div className="control-row">
                    <div className="control-label">
                      <div className="control-icon" style={{ background: environment.acStatus ? 'var(--accent-subtle)' : 'var(--surface-3)' }}>
                        <Wind size={15} color={environment.acStatus ? 'var(--accent)' : 'var(--text-muted)'} />
                      </div>
                      <div className="control-text">
                        <h4>Air Conditioning</h4>
                        <p style={{ color: environment.acStatus ? 'var(--accent)' : undefined }}>
                          {environment.acStatus ? 'ON — drains 12% extra' : 'OFF — optimal range'}
                        </p>
                      </div>
                    </div>
                    <button
                      title="Toggle AC"
                      onClick={() => { environment.acStatus ? medium() : light(); setEnvironment({ acStatus: !environment.acStatus }); }}
                      className={`toggle-track ${environment.acStatus ? 'on' : ''}`}
                    >
                      <div className="toggle-thumb" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* ══ LIVE RANGE SUMMARY ══ */}
            <div className="sidebar-section border-b-0">
              <div className="flex items-center gap-[8px] mb-[12px]">
                <div className="section-label text-[var(--accent)]">Calculated Range</div>
                <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
              </div>

              {/* Range Toggle UI */}
              <div className="flex rounded-[8px] p-1 bg-[var(--surface-3)] border border-[var(--border-subtle)] mb-4">
                <button
                  onClick={() => { tick(); setEnvironment({ rangeMode: 'arai' }); }}
                  className={`flex-1 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-[6px] transition-all ${
                    environment.rangeMode === 'arai'
                      ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-sm border border-[var(--accent-subtle)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  ARAI Factory
                </button>
                <button
                  onClick={() => { tick(); setEnvironment({ rangeMode: 'real' }); }}
                  className={`flex-1 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-[6px] transition-all ${
                    environment.rangeMode === 'real'
                      ? 'bg-[var(--surface-1)] text-[var(--success)] shadow-sm border border-[var(--success-subtle)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Real-World (-30%)
                </button>
              </div>

              <div className="range-ring-container">
                <div className="range-ring w-[104px] h-[104px]">
                  <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
                    <circle cx="52" cy="52" r={ringR} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
                    <circle
                      cx="52" cy="52" r={ringR}
                      fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
                      style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
                    />
                  </svg>
                  <div className="range-ring-label">
                    <div className="range-ring-percent" style={{ color: ringColor }}>{rangePercent}%</div>
                    <div className="range-ring-sub">Available</div>
                  </div>
                </div>

                <div className="range-stats">
                  <div className="range-stat-row">
                    <span className="range-stat-label">Net Range</span>
                    <span className="range-stat-value range-stat-value--large" style={{ color: ringColor }}>
                      {remainingRange}<span className="range-stat-unit">km</span>
                    </span>
                  </div>
                  <div className="range-stat-row">
                    <span className="range-stat-label">
                      {environment.rangeMode === 'real' ? 'Real-world Base' : 'ARAI Base'}
                    </span>
                    <span className="range-stat-value range-stat-value--medium">{displayBase} km</span>
                  </div>
                  <div className="range-stat-row">
                    <span className="range-stat-label">Penalty Loss</span>
                    <span className="range-stat-value range-stat-value--danger" style={{ color: lostRange > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      −{Math.abs(lostRange).toFixed(0)} km
                    </span>
                  </div>
                </div>
              </div>

              {anyPenalty && (
                <div className="flex flex-wrap gap-[6px] mt-[14px]">
                  {tempPenalty && (
                    <div className="penalty-chip bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning-border)]">
                      <Thermometer size={10} /> Temp Impact: −{tempPenalty}
                    </div>
                  )}
                  {acPenalty && (
                    <div className="penalty-chip bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-border)]">
                      <Wind size={10} /> −{acPenalty}
                    </div>
                  )}
                  {weightPenalty && (
                    <div className="penalty-chip bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success-border)]">
                      <Weight size={10} /> −{weightPenalty}
                    </div>
                  )}
                </div>
              )}

              {canComplete !== null && (
                <div className={`feasibility-banner mt-[14px] ${canComplete ? 'feasibility-banner--success' : 'feasibility-banner--danger'}`}>
                  {canComplete ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>
                    {canComplete
                      ? `Trip feasible. You'll reach with ~${(remainingRange - route.distanceKm).toFixed(0)} km to spare.`
                      : `Range too short — need ${(route.distanceKm - remainingRange).toFixed(0)} km more.`
                    }
                  </span>
                </div>
              )}

              {/* ══ MOBILE TELEMETRY STRIP (chart is desktop-only) ══ */}
              {hasDistance && (
                <div className="md:hidden mt-[14px] rounded-[10px] border border-[var(--border-subtle)] overflow-hidden">
                  <div className="px-3 py-2 bg-[var(--surface-2)] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-label)]">Trip Telemetry</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Estimated</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] bg-[var(--surface-1)]">
                    <div className="py-3 px-3 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">At Dest.</span>
                      <span className="text-[17px] font-bold tabular-nums" style={{ color: ringColor }}>
                        {(route.routePoints[route.routePoints.length - 1]?.predictedBatteryPercent ?? 0).toFixed(0)}%
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)]">battery</span>
                    </div>
                    <div className="py-3 px-3 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Distance</span>
                      <span className="text-[17px] font-bold tabular-nums text-[var(--text-primary)]">{route.distanceKm.toFixed(0)}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">km</span>
                    </div>
                    <div className="py-3 px-3 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Net Range</span>
                      <span className="text-[17px] font-bold tabular-nums" style={{ color: ringColor }}>{remainingRange}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">km avail.</span>
                    </div>
                  </div>
                  {/* Battery drain bar */}
                  <div className="h-[3px] bg-[var(--surface-3)]">
                    <div className="h-full transition-all duration-500" style={{ width: `${rangePercent}%`, background: ringColor }} />
                  </div>
                  {/* Embedded Mobile Chart */}
                  <div className="h-[220px] bg-[var(--surface-0)] border-t border-[var(--border-subtle)]">
                    <Suspense fallback={<ChartFallback />}>
                      <DrainChart />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-5">
            <div className="mb-[14px]">
              <div className="section-title">Nearby Chargers</div>
              <div className="section-subtitle">Stations fetched along your route</div>
            </div>
            
            {(!route.stations || route.stations.length === 0) ? (
              <div className="text-center py-10 opacity-60">
                <BatteryCharging size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-[12px] font-medium">No chargers found.</p>
                <p className="text-[11px] mt-1">Set a route to scan for stations.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {route.stations.map((st) => (
                  <div key={st.id} className="control-card hover:bg-[var(--surface-3)] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-[32px] h-[32px] rounded-full bg-[var(--success-subtle)] border border-[var(--success-border)] flex items-center justify-center flex-shrink-0 text-[var(--success)]">
                        <Zap size={14} />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[var(--text-primary)] leading-tight mb-1">{st.title}</div>
                        <div className="text-[11px] text-[var(--text-muted)] leading-snug flex items-start gap-1">
                          <MapPin size={10} className="mt-0.5 flex-shrink-0" />
                          <span>{st.address || 'Address not listed'}</span>
                        </div>
                        {st.connections && st.connections.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {st.connections.map((c, i: number) => (
                              <span key={i} className="text-[9px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                {c.Level ? `L${c.Level.ID}` : 'Plug'} • {c.PowerKW ? `${c.PowerKW}kW` : '15kW'}
                              </span>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            success();
                            addWaypoint([st.longitude, st.latitude]);
                            setActiveTab('planner');
                          }}
                          className="mt-3 w-full border border-[var(--accent)] text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-[4px] hover:bg-[var(--accent)] hover:text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <Navigation size={12} /> Add to Route
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Scroll hint — gradient + bouncing chevron, hidden once user reaches bottom ── */}
      {showScrollHint && (
        <div
          className="pointer-events-none absolute left-0 right-0 flex justify-center items-end pb-[var(--chart-h-mobile,60px)]"
          style={{
            bottom: 'var(--sidebar-footer-h, 44px)',
            height: 56,
            background: 'linear-gradient(to bottom, transparent, var(--glass-bg) 85%)',
          }}
        >
          <ChevronDown size={15} style={{ color: 'var(--text-muted)', animation: 'bounce 1.4s infinite' }} />
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div className="sidebar-footer mt-auto">
        <span className="text-[9.5px] text-[var(--text-muted)] font-medium tracking-[0.04em]">
          Data: MapTiler · Open-Meteo · OCM
        </span>
        <div className="flex items-center gap-[6px]">
          <div className="live-dot" />
          <span className="text-[9.5px] text-[var(--text-muted)] font-medium">Live sync</span>
        </div>
      </div>

    </div>
  );
});

export default Sidebar;
