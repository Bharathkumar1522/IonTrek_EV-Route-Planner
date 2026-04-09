"use client";

import React, { useState, useEffect, lazy, Suspense } from 'react';
import RouteMap from '@/components/map/RouteMapClient';
import Sidebar from '@/components/dashboard/Sidebar';
import { useEVStore } from '@/store/useEVStore';
import { Map, SlidersHorizontal, CheckCircle2, AlertTriangle, X, Zap } from 'lucide-react';

// Lazy load the chart — it's below the fold and uses heavyweight Recharts
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

export default function Home() {
  const { route, toastMessage, setToastMessage } = useEVStore();
  const [isMobileExpanded, setIsMobileExpanded] = useState(true);
  const [visibleToast, setVisibleToast] = useState<string | null>(null);

  // Auto-collapse on mobile when a route is successfully calculated
  useEffect(() => {
    if (route.distanceKm > 0) {
      setIsMobileExpanded(false);
    }
  }, [route.distanceKm]);

  // Show toast and auto-dismiss after 6s
  useEffect(() => {
    if (toastMessage) {
      setVisibleToast(toastMessage);
      const timer = setTimeout(() => {
        setVisibleToast(null);
        setToastMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[var(--surface-0)]">
      
      {/* Full-screen map layer */}
      <div className="absolute inset-0 z-0">
        <RouteMap />
      </div>

      {/* Map edge fades for visual blending */}
      <div className="map-edge-fade-top" />
      <div className="map-edge-fade-bottom" />

      {/* UI overlay layer */}
      <div className="absolute inset-0 z-10 flex flex-col md:flex-row p-3 md:p-4 gap-3 md:gap-4 pointer-events-none">
        
        {/* LEFT: Sidebar panel */}
        <div 
          className={`w-full md:w-[var(--sidebar-w)] flex-shrink-0 pointer-events-auto flex-col transition-all duration-300 z-50 
            ${isMobileExpanded ? 'flex h-[80vh] md:h-full opacity-100' : 'hidden md:flex h-full'}
          `}
        >
          <div className="relative h-full w-full flex flex-col">
            <Sidebar />
            
            {/* Mobile close button at the bottom of the open sidebar */}
            {route.distanceKm > 0 && isMobileExpanded && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 md:hidden">
                <button 
                  onClick={() => setIsMobileExpanded(false)}
                  className="bg-[var(--accent)] text-white px-6 py-2.5 rounded-full font-bold text-[13px] tracking-wide shadow-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  <Map size={16} /> View Route Map
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Floating collapsed Pill */}
        {!isMobileExpanded && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 md:hidden pointer-events-auto w-full px-4 flex justify-center">
            <button 
              onClick={() => setIsMobileExpanded(true)} 
              className="glass-panel w-full max-w-[320px] px-4 py-3 flex items-center justify-between shadow-[var(--shadow-elevated)] ring-1 ring-[var(--border-subtle)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-[32px] h-[32px] rounded-full bg-[var(--success-subtle)] border border-[var(--success-border)] flex flex-shrink-0 items-center justify-center text-[var(--success)]">
                  <CheckCircle2 size={16} />
                </div>
                <div className="text-left">
                  <div className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">Trip Active</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-none">{route.distanceKm.toFixed(0)} km path mapped</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--accent)] bg-[var(--accent-subtle)] px-3 py-1.5 rounded-full text-[11px] font-bold">
                <SlidersHorizontal size={13} /> Edit
              </div>
            </button>
          </div>
        )}

        {/* RIGHT: Spacer + bottom chart */}
        <div className="flex-1 flex flex-col justify-end pointer-events-none min-h-0">
          <div className="hidden md:block pointer-events-auto h-[var(--chart-h)] overflow-hidden glass-card">
            <Suspense fallback={<ChartFallback />}>
              <DrainChart />
            </Suspense>
          </div>
        </div>

      </div>

      {/* ─── RANGE ANXIETY TOAST ─── */}
      {visibleToast && (
        <div
          className="absolute bottom-[calc(var(--chart-h)+24px)] left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          style={{ animation: 'slideUpIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <div
            className="glass-panel flex items-start gap-3 px-4 py-3 max-w-[420px] w-max"
            style={{
              borderColor: 'rgba(251,191,36,0.3)',
              boxShadow: '0 8px 32px rgba(251,191,36,0.15), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {/* Icon */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              <Zap size={15} style={{ color: '#fbbf24' }} />
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-[var(--text-primary)] mb-0.5 flex items-center gap-1.5">
                <AlertTriangle size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
                Range Anxiety Alert
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
                {visibleToast}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => { setVisibleToast(null); setToastMessage(null); }}
              className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
