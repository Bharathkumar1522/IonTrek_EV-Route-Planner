"use client";
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('./RouteMap'), { 
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: 'var(--surface-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading map…</div>
    </div>
  )
});

export default RouteMap;
