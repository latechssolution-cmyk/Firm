"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

/** Submit button that opens a styled confirmation dialog (not native confirm)
 *  before firing a destructive server action. */
export function DeleteButton({
  id, action, label = "Delete", title = "Delete this item?",
  confirm = "This action cannot be undone.", small = false, idField = "id",
}: {
  id: string;
  action: (formData: FormData) => void;
  label?: string;
  title?: string;
  confirm?: string;
  small?: boolean;
  idField?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`themed btn-danger-outline rounded-lg font-semibold ${small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={confirm} size="sm"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="themed btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
            <form action={action}>
              <input type="hidden" name={idField} value={id} />
              <button type="submit" className="themed btn-danger-outline rounded-lg px-4 py-2 text-sm font-semibold">Delete</button>
            </form>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Please confirm you want to permanently delete this. This can&apos;t be undone.
        </p>
      </Modal>
    </>
  );
}
