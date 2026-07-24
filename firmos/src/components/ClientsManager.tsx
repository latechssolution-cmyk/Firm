"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, updateClient, deleteClient } from "@/lib/actions";
import { Button } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { Modal } from "@/components/Modal";
import { Field } from "@/components/Field";
import { Avatar } from "@/components/Avatar";

type Client = { id: string; name: string; cnic?: string; phone: string; address?: string; languagePref: "en" | "ur"; caseCount: number };

export function ClientsManager({ clients }: { clients: Client[] }) {
  const [editing, setEditing] = useState<Client | "new" | null>(null);

  // Close the modal once the server action returns fresh data (add/edit/delete).
  const sig = clients.map((c) => `${c.id}:${c.name}:${c.phone}:${c.languagePref}`).join("|");
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setEditing(null);
  }, [sig]);

  const isNew = editing === "new";
  const c = editing && editing !== "new" ? editing : null; // null-safe row for the form

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button kind="primary" type="button" onClick={() => setEditing("new")}>+ Add client</Button>
      </div>

      <div className="themed card overflow-x-auto rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}>
        <table>
          <thead><tr><th>Name</th><th>CNIC</th><th>Phone</th><th>Lang</th><th>Cases</th><th>Actions</th></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={c.name} size={30} />
                    <span className="font-semibold">{c.name}</span>
                  </span>
                </td>
                <td>{c.cnic ?? "—"}</td>
                <td>{c.phone}</td>
                <td className="uppercase">{c.languagePref}</td>
                <td>{c.caseCount}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(c)} className="themed btn-secondary rounded-lg px-2.5 py-1 text-xs font-semibold">Edit</button>
                    <DeleteButton id={c.id} action={deleteClient} small title={`Delete ${c.name}?`} confirm="Only allowed if the client has no cases." />
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? "Add client" : "Edit client"}
        description={isNew ? "Create a new client record." : "Update this client's details."}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="themed btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="submit" form="client-form" className="themed btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
              {isNew ? "Add client" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="client-form" key={c?.id ?? "new"} action={isNew ? createClient : updateClient} className="grid gap-3">
          {c && <input type="hidden" name="id" value={c.id} />}
          <Field label="Full name" required>
            <input name="name" required defaultValue={c?.name ?? ""} placeholder="e.g. Muhammad Malik" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNIC" hint="National ID (optional)">
              <input name="cnic" defaultValue={c?.cnic ?? ""} placeholder="35202-1234567-1" />
            </Field>
            <Field label="Phone" required>
              <input name="phone" required defaultValue={c?.phone ?? ""} placeholder="0300-1234567" />
            </Field>
          </div>
          <Field label="Address">
            <input name="address" defaultValue={c?.address ?? ""} placeholder="Optional" />
          </Field>
          <Field label="Preferred language" hint="Used for portal & notifications">
            <select name="languagePref" defaultValue={c?.languagePref ?? "en"}>
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
