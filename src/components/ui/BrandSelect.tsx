"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Search, PenLine } from "lucide-react";

export const CAR_BRANDS = [
  "Volkswagen", "Toyota", "Kia", "Skoda", "Renault", "BMW", "Peugeot",
  "Tesla", "Volvo", "Audi", "Mercedes-Benz", "Ford", "Opel", "Hyundai",
  "Citroën", "Dacia", "Suzuki", "Mazda", "Fiat", "Nissan", "SEAT",
  "Cupra", "MINI", "Honda", "BYD", "Jeep", "Land Rover", "Porsche",
  "Lexus", "Mitsubishi",
];

type BrandSelectProps = {
  value: string;
  onChange: (brand: string) => void;
  placeholder?: string;
  error?: boolean;
  allowCustom?: boolean;
  customLabel?: string;
  customValue?: string;
  onCustomChange?: (value: string) => void;
};

export function BrandSelect({
  value,
  onChange,
  placeholder = "Automerk",
  error = false,
  allowCustom = false,
  customLabel = "Andere merk…",
  customValue = "",
  onCustomChange,
}: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // customMode = true quand l'utilisateur veut saisir une marque hors liste
  const [customMode, setCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isCustom = allowCustom && !CAR_BRANDS.includes(value) && value !== "";
  const filtered = CAR_BRANDS.filter((b) =>
    b.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (customMode) setTimeout(() => customInputRef.current?.focus(), 50);
  }, [customMode]);

  function handleSelect(brand: string) {
    if (brand === "__custom__") {
      setCustomMode(true);
      onChange("");
      setOpen(false);
      setSearch("");
      return;
    }
    onChange(brand);
    setCustomMode(false);
    setOpen(false);
    setSearch("");
  }

  function exitCustomMode() {
    setCustomMode(false);
    onChange("");
    onCustomChange?.("");
  }

  const baseCls = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2`;
  const stateCls = error
    ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
    : "border-border bg-background focus:border-primary focus:ring-primary/10";

  // Mode saisie libre
  if (customMode || isCustom) {
    return (
      <div ref={containerRef} className="flex gap-2">
        <input
          ref={customInputRef}
          type="text"
          value={customValue || value}
          onChange={(e) => onCustomChange?.(e.target.value)}
          placeholder="Saisir la marque…"
          className={`${baseCls} ${stateCls} flex-1`}
        />
        <button
          type="button"
          onClick={exitCustomMode}
          className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition"
          title="Retour à la liste"
        >
          ← Liste
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${baseCls} ${stateCls} flex items-center justify-between text-left ${!value ? "text-muted-foreground" : "text-foreground"}`}
      >
        <span>{value || placeholder}</span>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Barre de recherche */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoeken..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Liste */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground text-center">Geen resultaten</li>
            ) : (
              filtered.map((brand) => (
                <li
                  key={brand}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(brand); }}
                  className={`cursor-pointer px-3 py-2.5 text-sm transition-colors ${
                    value === brand
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {brand}
                </li>
              ))
            )}

            {/* Option marque personnalisée */}
            {allowCustom && (
              <li
                onMouseDown={(e) => { e.preventDefault(); handleSelect("__custom__"); }}
                className="flex cursor-pointer items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
              >
                <PenLine className="h-3.5 w-3.5" />
                {customLabel}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
