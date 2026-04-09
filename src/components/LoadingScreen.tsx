"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useEVStore } from '@/store/useEVStore';

// Step labels shown while the map loads in the background.
// These are purely cosmetic — they don't gate anything.
const STEPS = [
  'Initialising map engine…',
  'Loading terrain data…',
  'Connecting weather service…',
  'Syncing charging network…',
  'Almost ready…',
];

// Minimum visual steps before we CAN exit (prevents a <200ms flash)
const MIN_STEPS_BEFORE_EXIT = 2;

interface Props {
  onDone: () => void;
}

export default function LoadingScreen({ onDone }: Props) {
  const mapInitialized = useEVStore((s) => s.mapInitialized);

  const [stepIdx, setStepIdx]   = useState(0);
  const [pct, setPct]           = useState(5);
  const [exiting, setExiting]   = useState(false);
  const [pathLen, setPathLen]   = useState(0);
  const pathRef    = useRef<SVGPathElement>(null);
  const stepsDone  = useRef(0);
  const readyRef   = useRef(false); // becomes true when map fires 'load'
  const canExit    = useRef(false); // true once MIN_STEPS_BEFORE_EXIT passed

  // Measure SVG path length for the stroke animation
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  // Track map readiness in a ref so the step ticker can read it instantly
  useEffect(() => {
    readyRef.current = mapInitialized;
  }, [mapInitialized]);

  // Step ticker: advances through labels while map loads in background.
  // Once canExit is true (MIN steps passed) AND map is ready → exit.
  useEffect(() => {
    let cancelled = false;
    let current = 0;

    const tick = () => {
      if (cancelled) return;

      if (current < STEPS.length) {
        current++;
        stepsDone.current = current;
        setStepIdx(current - 1);
        // Progress bar: first step = 15%, last real step = 90%, 100% on exit
        setPct(Math.round(15 + ((current - 1) / (STEPS.length - 1)) * 75));

        if (current >= MIN_STEPS_BEFORE_EXIT) {
          canExit.current = true;
        }

        // If map already loaded by the time this step fires, exit now
        if (canExit.current && readyRef.current) {
          finishAndExit();
          return;
        }

        // Spread steps evenly across ~1.8s so we don't just spin forever
        const delay = 360 + Math.random() * 200;
        setTimeout(tick, delay);
      } else {
        // All steps done — wait for map if it's still loading
        const poll = setInterval(() => {
          if (cancelled) { clearInterval(poll); return; }
          if (readyRef.current) {
            clearInterval(poll);
            finishAndExit();
          }
        }, 80);
      }
    };

    const finishAndExit = () => {
      if (cancelled) return;
      setPct(100);
      setTimeout(() => {
        if (!cancelled) {
          setExiting(true);
          setTimeout(onDone, 550);
        }
      }, 180);
    };

    setTimeout(tick, 120);
    return () => { cancelled = true; };
  }, [onDone]);

  // Fast-path: if the map loaded before we even started (e.g. cached page),
  // let the minimal animation run its normal course — no extra logic needed.

  return (
    <div
      className={`iontrek-loader${exiting ? ' iontrek-loader--exit' : ''}`}
      aria-label="Loading IonTrek"
      aria-live="polite"
    >
      <div className="iontrek-loader__mesh" />
      <div className="iontrek-loader__ring iontrek-loader__ring--1" />
      <div className="iontrek-loader__ring iontrek-loader__ring--2" />

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

        <h1 className="iontrek-loader__brand">IonTrek</h1>
        <p  className="iontrek-loader__tagline">EV Route Planner · India</p>

        {/* Animated route path — draws as progress advances */}
        <div className="iontrek-loader__route-svg-wrap">
          <svg viewBox="0 0 280 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="iontrek-loader__route-svg">
            {/* Ghost track */}
            <path
              d="M14 21 C 40 5, 80 38, 140 21 S 230 4, 266 21"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.12"
            />
            {/* Animated fill — progress driven */}
            <path
              ref={pathRef}
              d="M14 21 C 40 5, 80 38, 140 21 S 230 4, 266 21"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{
                strokeDasharray: pathLen || 360,
                strokeDashoffset: pathLen
                  ? pathLen * (1 - pct / 100)
                  : 360 * (1 - pct / 100),
                transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
            <circle cx="14"  cy="21" r="5" fill="currentColor" opacity="0.9" />
            <circle cx="266" cy="21" r="5" fill="currentColor" opacity="0.35" />
          </svg>
        </div>

        {/* Progress bar */}
        <div className="iontrek-loader__bar-track">
          <div className="iontrek-loader__bar-fill" style={{ width: `${pct}%` }} />
        </div>

        {/* Step label + % */}
        <div className="iontrek-loader__footer">
          <span className="iontrek-loader__step-label">
            {STEPS[stepIdx] ?? 'Launching…'}
          </span>
          <span className="iontrek-loader__pct">{pct}%</span>
        </div>

      </div>

      <div className="iontrek-loader__bottom-strip">
        <span className="iontrek-loader__data-credits">
          Powered by MapTiler · Open-Meteo · OpenChargeMap · OSRM
        </span>
      </div>
    </div>
  );
}
