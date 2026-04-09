"use client";

import React, { useMemo, useId, useEffect, useRef, useCallback } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { RoutePoint } from '@/types';
import { useEVStore } from '@/store/useEVStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Navigation } from 'lucide-react';

const DrainChart = React.memo(function DrainChart() {
  const { route, setHoveredDistanceKm } = useEVStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  // Theme-adaptive colors
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
  const axisColor = isLight ? '#9ca3af' : '#4b5563';
  const accentColor = isLight ? '#0a8f9e' : '#22d3ee';
  const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.97)' : 'rgba(14, 18, 27, 0.95)';
  const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)';
  const successColor = isLight ? '#16a34a' : '#34d399';
  const warningColor = isLight ? '#ca8a04' : '#fbbf24';
  const dangerColor = isLight ? '#dc2626' : '#f87171';

  const getBatteryColor = (val: number) =>
    val > 30 ? successColor : val > 15 ? warningColor : dangerColor;

  const uid = useId();
  const gradientId = `${uid}-elevGrad`;

  const chartData = route.routePoints || [];

  // ── ALL hooks must be declared before any early return (Rules of Hooks) ──

  const CustomTooltip = useMemo(() => function TooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const battery = payload.find((p: any) => p.dataKey === 'predictedBatteryPercent')?.value ?? 0;
    const elev = payload.find((p: any) => p.dataKey === 'elevationMeters')?.value;
    const temp = payload.find((p: any) => p.dataKey === 'temperatureC')?.value;
    const battColor = getBatteryColor(battery);
    return (
      <div style={{
        background: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        borderRadius: 10,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        minWidth: 140,
        boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.08)' : '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase' as const,
          marginBottom: 8, borderBottom: `1px solid ${tooltipBorder}`, paddingBottom: 6,
        }}>
          {label} km
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Battery</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: battColor, fontVariantNumeric: 'tabular-nums' }}>{battery}%</div>
          </div>
          <div style={{ width: 1, background: tooltipBorder }} />
          {elev !== undefined && (
            <>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Elevation</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{elev}m</div>
              </div>
              <div style={{ width: 1, background: tooltipBorder }} />
            </>
          )}
          {temp !== undefined && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Temp</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>{temp}°C</div>
            </div>
          )}
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipBg, tooltipBorder, isLight, getBatteryColor]);

  const lastBattery = chartData[chartData.length - 1]?.predictedBatteryPercent ?? 0;
  const lastBattColor = getBatteryColor(lastBattery);

  const rafIdRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: any) => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (e && e.activePayload && e.activePayload.length > 0) {
        setHoveredDistanceKm(e.activePayload[0].payload.distanceKm);
      }
    });
  }, [setHoveredDistanceKm]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">
        <div className="chart-empty-icon">
          <Navigation size={20} />
        </div>
        <div className="chart-empty-text">Set a route to see telemetry</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col pt-4 pb-2 px-2 md:px-5">
      <div className="chart-header flex-col md:flex-row items-start md:items-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="section-label hidden md:block" style={{ color: 'var(--accent)' }}>
            Terrain & Battery Telemetry
          </div>
        </div>
        <div className="chart-legend flex-wrap md:flex-nowrap w-full md:w-auto" style={{ marginTop: '0', gap: '10px' }}>
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: accentColor, opacity: 0.8 }} />
            <span>Elevation (m)</span>
          </div>
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: lastBattColor }} />
            <span>Battery (%)</span>
          </div>
          <div className="status-pill ml-auto" style={{
            color: lastBattColor,
            background: `color-mix(in srgb, ${lastBattColor} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${lastBattColor} 20%, transparent)`,
            padding: '2px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap'
          }}>
            {lastBattery.toFixed(0)}% at dest.
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredDistanceKm(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="distanceKm" 
              type="number" 
              domain={[0, 'dataMax']}
              tickFormatter={(v) => `${v.toFixed(0)} km`}
              stroke="var(--text-muted)" 
              fontSize={10} 
              tickLine={false} 
              axisLine={{ stroke: 'var(--border-subtle)' }}
              minTickGap={20}
            />
            <YAxis 
              yAxisId="elevation" 
              orientation="left" 
              width={35}
              tick={{ fill: axisColor, fontSize: 10 }} 
              tickFormatter={(val) => `${val}m`}
              stroke="transparent" 
            />
            <YAxis 
              yAxisId="battery" 
              orientation="right" 
              domain={[0, 100]} 
              width={35}
              tick={{ fill: axisColor, fontSize: 10, fontWeight: 600 }} 
              tickFormatter={(val) => `${val}%`}
              stroke="transparent" 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <ReferenceLine yAxisId="battery" y={20} stroke={`color-mix(in srgb, ${dangerColor} 50%, transparent)`} strokeDasharray="3 3" />
            <Area yAxisId="elevation" type="monotone" dataKey="elevationMeters" stroke={accentColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} />
            <Line
              yAxisId="battery" type="monotone" dataKey="predictedBatteryPercent"
              stroke={lastBattColor}
              strokeWidth={3} dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface-0)' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default DrainChart;
