"use client";

/** Submit button that confirms before firing a destructive server action. */
export function DeleteButton({
  id, action, label = "Delete", confirm = "Delete this item? This cannot be undone.", small = false, idField = "id",
}: {
  id: string;
  action: (formData: FormData) => void;
  label?: string;
  confirm?: string;
  small?: boolean;
  idField?: string;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }}>
      <input type="hidden" name={idField} value={id} />
      <button
        type="submit"
        className={`themed btn-danger-outline rounded-md font-semibold ${small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        {label}
      </button>
    </form>
  );
}
