"use client";

import { useState } from "react";
import { createClient, updateClient, deleteClient } from "@/lib/actions";
import { Button } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

type Client = { id: string; name: string; cnic?: string; phone: string; address?: string; languagePref: "en" | "ur"; caseCount: number };

export function ClientsManager({ clients }: { clients: Client[] }) {
  const [editing, setEditing] = useState<Client | "new" | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button kind="primary" type="button" onClick={() => setEditing("new")}>+ Add client</Button>
      </div>

      <div className="themed card overflow-x-auto rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}>
        <table>
          <thead><tr><th>Name</th><th>CNIC</th><th>Phone</th><th>Lang</th><th>Cases</th><th>Actions</th></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}</td>
                <td>{c.cnic ?? "—"}</td>
                <td>{c.phone}</td>
                <td className="uppercase">{c.languagePref}</td>
                <td>{c.caseCount}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(c)} className="themed btn-secondary rounded-md px-2.5 py-1 text-xs font-semibold">Edit</button>
                    <DeleteButton id={c.id} action={deleteClient} small confirm={`Delete ${c.name}? (Only allowed if they have no cases.)`} />
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-bg) 60%, transparent)" }}
          onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="themed modal-in w-full max-w-md rounded-lg border p-5"
            style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-border-interactive)", boxShadow: "var(--shadow-lg)" }}>
            <h3 className="mb-3 font-bold">{editing === "new" ? "Add client" : "Edit client"}</h3>
            <form action={editing === "new" ? createClient : updateClient} className="grid gap-3">
              {editing !== "new" && <input type="hidden" name="id" value={editing.id} />}
              <label className="text-sm">Name
                <input name="name" required defaultValue={editing === "new" ? "" : editing.name} className="mt-1" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">CNIC
                  <input name="cnic" defaultValue={editing === "new" ? "" : editing.cnic ?? ""} placeholder="35202-1234567-1" className="mt-1" />
                </label>
                <label className="text-sm">Phone
                  <input name="phone" required defaultValue={editing === "new" ? "" : editing.phone} className="mt-1" />
                </label>
              </div>
              <label className="text-sm">Address
                <input name="address" defaultValue={editing === "new" ? "" : editing.address ?? ""} className="mt-1" />
              </label>
              <label className="text-sm">Preferred language
                <select name="languagePref" defaultValue={editing === "new" ? "en" : editing.languagePref} className="mt-1">
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditing(null)} className="themed btn-secondary rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
                <Button kind="primary">{editing === "new" ? "Add client" : "Save changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
