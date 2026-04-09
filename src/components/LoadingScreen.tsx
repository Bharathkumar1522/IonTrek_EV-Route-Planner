"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

const STEPS = [
  { label: 'Initialising map engine…',    pct: 15 },
  { label: 'Loading terrain data…',       pct: 38 },
  { label: 'Connecting weather service…', pct: 60 },
  { label: 'Syncing charging network…',   pct: 80 },
  { label: 'Almost ready…',               pct: 95 },
];

interface Props {
  onDone: () => void;
}

export default function LoadingScreen({ onDone }: Props) {
  const [stepIdx, setStepIdx]     = useState(0);
  const [pct, setPct]             = useState(0);
  const [exiting, setExiting]     = useState(false);
  const [pathLen, setPathLen]     = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  // Measure the SVG path length once it mounts
  useEffect(() => {
    if (pathRef.current) {
      setPathLen(pathRef.current.getTotalLength());
    }
  }, []);

  // Drive the step sequence
  useEffect(() => {
    let idx = 0;
    const tick = () => {
      const next = STEPS[idx];
      if (!next) {
        // Finish
        setPct(100);
        setTimeout(() => { setExiting(true); setTimeout(onDone, 600); }, 350);
        return;
      }
      setPct(next.pct);
      setStepIdx(idx);
      idx++;
      setTimeout(tick, 420 + Math.random() * 260);
    };
    const t = setTimeout(tick, 150);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`iontrek-loader${exiting ? ' iontrek-loader--exit' : ''}`}
      aria-label="Loading IonTrek"
      aria-live="polite"
    >
      {/* ── Animated gradient mesh background ── */}
      <div className="iontrek-loader__mesh" />

      {/* ── Orbiting accent rings ── */}
      <div className="iontrek-loader__ring iontrek-loader__ring--1" />
      <div className="iontrek-loader__ring iontrek-loader__ring--2" />

      {/* ── Centre card ── */}
      <div className="iontrek-loader__card">

        {/* Logo */}
        <div className="iontrek-loader__logo-wrap">
          <div className="iontrek-loader__logo-glow" />
          <div className="iontrek-loader__logo-box">
            <Image
              src="/logo.png"
              alt="IonTrek"
              width={52}
              height={52}
              priority
              style={{ borderRadius: 14, objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Brand */}
        <h1 className="iontrek-loader__brand">IonTrek</h1>
        <p  className="iontrek-loader__tagline">EV Route Planner · India</p>

        {/* Animated SVG route line */}
        <div className="iontrek-loader__route-svg-wrap">
          <svg viewBox="0 0 280 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="iontrek-loader__route-svg">
            {/* Track */}
            <path
              d="M14 21 C 40 5, 80 38, 140 21 S 230 4, 266 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.12"
            />
            {/* Animated fill */}
            <path
              ref={pathRef}
              d="M14 21 C 40 5, 80 38, 140 21 S 230 4, 266 21"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                strokeDasharray: pathLen || 360,
                strokeDashoffset: pathLen ? pathLen * (1 - pct / 100) : 360 * (1 - pct / 100),
                transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
            {/* Start dot */}
            <circle cx="14" cy="21" r="5" fill="currentColor" opacity="0.9" />
            {/* End dot */}
            <circle cx="266" cy="21" r="5" fill="currentColor" opacity="0.35" />
          </svg>
        </div>

        {/* Progress bar */}
        <div className="iontrek-loader__bar-track">
          <div
            className="iontrek-loader__bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Step label + percentage */}
        <div className="iontrek-loader__footer">
          <span className="iontrek-loader__step-label">
            {STEPS[stepIdx]?.label ?? 'Launching…'}
          </span>
          <span className="iontrek-loader__pct">{pct}%</span>
        </div>

      </div>

      {/* ── Bottom tagline strip ── */}
      <div className="iontrek-loader__bottom-strip">
        <span className="iontrek-loader__data-credits">
          Powered by MapTiler · Open-Meteo · OpenChargeMap · OSRM
        </span>
      </div>
    </div>
  );
}
