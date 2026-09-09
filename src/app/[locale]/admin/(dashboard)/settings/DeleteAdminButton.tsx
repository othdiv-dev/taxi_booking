"use client";

import { deleteAdminAction } from "../../actions";

export default function DeleteAdminButton({ id, name }: { id: number; name: string }) {
  return (
    <form
      action={deleteAdminAction}
      onSubmit={(e) => {
        if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`))
          e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-red-500 hover:underline">
        🗑️ Supprimer
      </button>
    </form>
  );
}