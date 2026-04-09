"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { searchLocations, LocationFeature } from '@/lib/maptiler';

interface LocationSearchProps {
  placeholder: string;
  onSelect: (location: LocationFeature) => void;
}

export default function LocationSearch({ placeholder, onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Flag to skip the next search when query is set programmatically (after selection)
  const justSelectedRef = useRef(false);

  useEffect(() => {
    // If the query was just set by a selection, skip searching
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsSearching(true);
        try {
          const data = await searchLocations(query);
          setResults(data);
          setIsOpen(true);
        } catch (err) {
          console.warn('Location search failed:', err);
          setResults([]);
          setIsOpen(false);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handle = (feature: LocationFeature) => {
    // Mark that this query change is from a selection, not user typing
    justSelectedRef.current = true;
    setQuery(feature.place_name);
    setResults([]);
    setIsOpen(false);
    onSelect(feature);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1,
        }}>
          {isSearching
            ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <Search size={14} />
          }
        </div>
        <input
          type="text"
          className="ev-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-dropdown fade-in-up">
          {results.map((f) => (
            <button
              key={f.id}
              className="search-dropdown-item"
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
              // Use onMouseDown instead of onClick so it fires before the input's onBlur
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur from closing dropdown first
                handle(f);
              }}
            >
              <MapPin size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{f.place_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
