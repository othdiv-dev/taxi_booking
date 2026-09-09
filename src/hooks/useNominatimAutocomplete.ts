"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NominatimSuggestion = {
  place_id: number;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  type: string;
  class: string;
};

type UseNominatimOptions = {
  debounceMs?: number;
  countryCodes?: string;
  featureType?: "city" | "street" | "all";
};

type UseNominatimResult = {
  suggestions: NominatimSuggestion[];
  loading: boolean;
  search: (query: string) => void;
  clear: () => void;
};

export function useNominatimAutocomplete(options: UseNominatimOptions = {}): UseNominatimResult {
  const { debounceMs = 400, countryCodes = "nl,be,de,fr,lu", featureType = "all" } = options;

  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = query.trim();
      if (trimmed.length < 2) {
        clear();
        return;
      }

      debounceRef.current = setTimeout(async () => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        try {
          // Appel vers notre proxy serveur /api/geocode (pas directement Nominatim)
          const params = new URLSearchParams({ q: trimmed });
          if (countryCodes) params.set("countryCodes", countryCodes);
          if (featureType && featureType !== "all") params.set("featureType", featureType);

          const res = await fetch(`/api/geocode?${params.toString()}`, {
            signal: abortRef.current.signal,
          });

          if (!res.ok) throw new Error("geocode error");
          const data: NominatimSuggestion[] = await res.json();
          setSuggestions(data);
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            setSuggestions([]);
          }
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [clear, debounceMs, countryCodes, featureType]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { suggestions, loading, search, clear };
}
