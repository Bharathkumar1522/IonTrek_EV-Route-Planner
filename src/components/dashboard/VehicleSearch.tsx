"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Car, ChevronDown } from 'lucide-react';
import { useEVStore, getEVTypeInfo } from '@/store/useEVStore';
import { EVModel } from '@/types';
import { useHaptic } from '@/lib/useHaptic';

export default function VehicleSearch() {
  const { models, selectedEV, selectEV } = useEVStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EVModel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { light } = useHaptic();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic
  useEffect(() => {
    if (!query) {
      setResults(models);
      return;
    }
    const q = query.toLowerCase();
    const filtered = models.filter(m => m.name.toLowerCase().includes(q));
    setResults(filtered);
  }, [query, models]);

  const handleSelect = (ev: EVModel) => {
    light();
    selectEV(ev.id);
    setIsOpen(false);
    setQuery('');
  };

  const selectedInfo = getEVTypeInfo(selectedEV.id);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Select Vehicle</h3>
      </div>
      <p className="section-subtitle mb-2">Choose your EV from the Indian market</p>
      
      <div ref={wrapperRef} className="relative w-full">
        {/* Toggle / Current Selected Button */}
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-full text-left bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] rounded-[10px] p-3 pl-11 flex items-center justify-between transition-colors shadow-sm"
          >
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-primary)]">
              <Car size={16} color={selectedInfo.color} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
                {selectedEV.name}
              </div>
              <div className="text-[11px] font-medium text-[var(--text-muted)] mt-1 flex items-center gap-2">
                <span>{selectedEV.batteryCapacitykWh} kWh</span>
                <span className="w-1 h-1 rounded-full bg-[var(--border-default)]" />
                <span>{selectedEV.baseRangeKm} km ARAI</span>
              </div>
            </div>
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </button>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
              <Search size={14} />
            </div>
            <input
              ref={inputRef}
              type="text"
              className="ev-input auto-focus"
              autoFocus
              placeholder="Search EVs (e.g. Nexon, MG...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        {/* Dropdown Results */}
        {isOpen && (
          <div className="search-dropdown fade-in-up" style={{ maxHeight: 300 }}>
            {results.length > 0 ? (
              results.map((ev) => {
                const info = getEVTypeInfo(ev.id);
                const isSelected = selectedEV.id === ev.id;
                
                return (
                  <button
                    key={ev.id}
                    className="search-dropdown-item w-full text-left bg-none border-none group"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(ev);
                    }}
                  >
                    <Car size={14} color={info.color} className="flex-shrink-0 mt-1 opacity-80 group-hover:opacity-100" />
                    <div>
                      <div className="text-[13px] font-semibold leading-[1.3]" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {ev.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-[2px] leading-[1.3]">
                        {ev.batteryCapacitykWh} kWh • {ev.baseRangeKm} km
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-[12px] text-[var(--text-muted)]">
                No vehicles found for "{query}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
