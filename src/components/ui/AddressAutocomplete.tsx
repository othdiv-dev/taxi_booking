"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { useNominatimAutocomplete, type NominatimSuggestion } from "@/hooks/useNominatimAutocomplete";

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: NominatimSuggestion) => void;
  placeholder?: string;
  className?: string;
  countryCodes?: string;
  featureType?: "city" | "street" | "all";
  id?: string;
  "aria-label"?: string;
};

/** Libellé lisible depuis un résultat Nominatim */
function formatLabel(s: NominatimSuggestion): string {
  const { address } = s;
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? "";
  const road = address.road ?? "";
  const number = address.house_number ?? "";
  const postcode = address.postcode ?? "";
  const country = address.country ?? "";

  if (road) {
    return [number ? `${road} ${number}` : road, postcode ? `${postcode} ${city}` : city, country]
      .filter(Boolean).join(", ");
  }
  return [postcode ? `${postcode} ${city}` : city, country].filter(Boolean).join(", ");
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className = "",
  countryCodes,
  featureType = "all",
  id,
  "aria-label": ariaLabel,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { suggestions, loading, search, clear } = useNominatimAutocomplete({
    countryCodes,
    featureType,
  });

  // Fermer si clic en dehors
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Ouvrir quand des suggestions arrivent
  useEffect(() => {
    setActiveIndex(-1);
    if (suggestions.length > 0) setOpen(true);
    else setOpen(false);
  }, [suggestions]);

  // Scroll vers l'élément actif
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLLIElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (v.trim().length >= 2) {
      search(v);
    } else {
      clear();
      setOpen(false);
    }
  }

  function handleSelect(suggestion: NominatimSuggestion) {
    const label = formatLabel(suggestion);
    onChange(label);
    onSelect?.(suggestion);
    clear();
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) handleSelect(suggestions[activeIndex]);
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  function handleClear() {
    onChange("");
    clear();
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-activedescendant={activeIndex >= 0 ? `ac-item-${activeIndex}` : undefined}
          role="combobox"
          className={`pl-8 ${value ? "pr-8" : "pr-3"} ${className}`}
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : value ? (
          <button type="button" onClick={handleClear} tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Effacer">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <ul ref={listRef} role="listbox"
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {suggestions.map((s, i) => {
            const label = formatLabel(s);
            const isActive = i === activeIndex;
            return (
              <li key={s.place_id} id={`ac-item-${i}`} role="option" aria-selected={isActive}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                }`}>
                <MapPin className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="line-clamp-2 leading-snug">{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
