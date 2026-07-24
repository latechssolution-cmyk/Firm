import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setInquiryStatus, convertInquiry, createInquiry, deleteInquiry } from "@/lib/actions";
import { PageTitle, Card, Badge, Button, Empty } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { Collapsible } from "@/components/Collapsible";

export default async function InquiriesPage() {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  return (
    <div>
      <PageTitle right={<a href="/reception" className="text-sm">Open AI receptionist ↗</a>}>Inquiries</PageTitle>

      <Collapsible label="+ Log inquiry manually" className="mb-4">
        <Card>
          <form action={createInquiry} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Caller name
              <input name="callerName" required className="mt-1" />
            </label>
            <label className="text-sm">Phone
              <input name="phone" className="mt-1" />
            </label>
            <label className="text-sm">Matter type
              <input name="matterType" placeholder="e.g. Criminal — bail" className="mt-1" />
            </label>
            <label className="text-sm">Urgency
              <select name="urgency" className="mt-1"><option value="normal">Normal</option><option value="urgent">Urgent</option></select>
            </label>
            <label className="text-sm md:col-span-2">Summary
              <textarea name="summary" rows={2} className="mt-1" />
            </label>
            <div className="md:col-span-2"><Button kind="primary">Log inquiry</Button></div>
          </form>
        </Card>
      </Collapsible>

      {db.inquiries.length === 0 && <Card><Empty>No inquiries yet — try the AI receptionist.</Empty></Card>}
      <div className="flex flex-col gap-3">
        {db.inquiries.map((q) => (
          <Card key={q.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold">
                {q.callerName} <span className="text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>· {q.phone} · {q.channel}</span>
              </div>
              <div className="flex items-center gap-2">
                {q.urgency === "urgent" && <Badge tone="danger">⚑ urgent</Badge>}
                <Badge tone={q.status === "new" ? "info" : q.status === "converted" ? "success" : "neutral"}>{q.status}</Badge>
              </div>
            </div>
            <div className="mt-1 text-sm"><span className="font-semibold">{q.matterType}</span> — {q.summary}</div>
            {q.callbackSlot && <div className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>Callback booked: {q.callbackSlot}</div>}
            {q.transcript.length > 0 && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-xs" style={{ color: "var(--color-text-secondary)" }}>Transcript ({q.transcript.length} messages)</summary>
                <div className="mt-2 flex flex-col gap-1">
                  {q.transcript.map((m, i) => (
                    <div key={i} className="rounded-md p-2 text-xs" style={{ background: "var(--color-muted-bg)" }}>
                      <span className="font-bold">{m.from === "caller" ? "Caller" : "Assistant"}:</span> {m.text}
                    </div>
                  ))}
                </div>
              </details>
            )}
            <form action={setInquiryStatus} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="inquiryId" value={q.id} />
              <select name="status" defaultValue={q.status} className="!w-auto !py-1 text-xs" aria-label="Inquiry status">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="consulted">Consultation held</option>
                <option value="converted">Converted to client</option>
                <option value="closed">Closed</option>
              </select>
              <Button kind="secondary">Update</Button>
            </form>
            <div className="mt-2 flex items-center gap-2">
              {q.status !== "converted" && (
                <form action={convertInquiry}>
                  <input type="hidden" name="inquiryId" value={q.id} />
                  <Button kind="primary">✓ Convert to client</Button>
                </form>
              )}
              <DeleteButton id={q.id} action={deleteInquiry} confirm={`Delete inquiry from ${q.callerName}?`} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
