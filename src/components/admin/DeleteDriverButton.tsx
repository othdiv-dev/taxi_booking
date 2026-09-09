"use client";

import { deleteDriverAction } from "@/app/[locale]/admin/actions";

interface Props {
  id: number;
  name: string;
  variant?: "card" | "table";
}

export default function DeleteDriverButton({ id, name, variant = "card" }: Props) {
  return (
    <form
      action={deleteDriverAction}
      className={variant === "table" ? "inline" : undefined}
      onSubmit={(e) => {
        if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {variant === "table" ? (
        <button type="submit" className="text-xs text-red-500 hover:underline">
          Verwijderen
        </button>
      ) : (
        <button
          type="submit"
          className="rounded-xl bg-red-100 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-200 transition"
        >
          ✕
        </button>
      )}
    </form>
  );
}