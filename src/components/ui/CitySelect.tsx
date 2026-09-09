"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

type Zone = { id: number; name: string; slug: string };

type CitySelectProps = {
  value: string;
  onChange: (city: string) => void;
  zones: Zone[];
  placeholder?: string;
  className?: string;
};

export function CitySelect({ value, onChange, zones, placeholder = "Stad", className = "" }: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = zones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase())
  );

  // Fermer si clic en dehors
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

  // Focus sur la recherche à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  function handleSelect(name: string) {
    onChange(name);
    setOpen(false);
    setSearch("");
  }

  const inputCls = "w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/25";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Champ principal cliquable */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left ${!value ? "text-muted-foreground" : "text-foreground"}`}
      >
        <span>{value || placeholder}</span>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        }
      </button>

      {/* Dropdown */}
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

          {/* Liste des villes */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground text-center">Geen resultaten</li>
            ) : (
              filtered.map((z) => (
                <li
                  key={z.id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(z.name); }}
                  className={`cursor-pointer px-3 py-2.5 text-sm transition-colors ${
                    value === z.name
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {z.name}
                </li>
              ))
            )}
            {/* Option ville hors liste */}
            <li
              onMouseDown={(e) => { e.preventDefault(); handleSelect("__other__"); }}
              className="cursor-pointer border-t border-border px-3 py-2.5 text-sm text-muted-foreground italic hover:bg-muted transition-colors"
            >
              Andere stad…
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
