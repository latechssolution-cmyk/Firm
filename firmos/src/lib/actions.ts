"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDB, persist, uid, audit, enqueueNotification, resetDemo, resyncAll } from "./db";
import { SESSION_COOKIE, requireUser } from "./auth";

export async function login(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const db = await getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) redirect("/login");
  cookies().set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  await audit({ userId: user.id, userName: user.name, action: "login", entityType: "session", entityId: "-" });
  redirect(user.role === "client" ? "/portal" : "/dashboard");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

/** One entry → diary update + portal timeline + client notification + audit (PRD CM-6). */
export async function recordHearing(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const caseId = String(formData.get("caseId"));
  const outcome = String(formData.get("outcome") ?? "").trim();
  const nextDate = String(formData.get("nextDate") ?? "");
  const purpose = String(formData.get("purpose") ?? "Hearing");
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === caseId);
  if (!kase || !outcome) return;

  const today = new Date().toISOString().slice(0, 10);
  db.hearings.unshift({
    id: uid("h"), caseId, date: today, purpose, outcomeNote: outcome,
    nextDate: nextDate || undefined, readiness: "na", enteredBy: user.id, enteredAt: new Date().toISOString(),
  });
  if (nextDate) {
    db.hearings.unshift({
      id: uid("h"), caseId, date: nextDate, purpose: "Next hearing", readiness: "pending",
      enteredBy: user.id, enteredAt: new Date().toISOString(),
    });
  }
  // Optional stage advancement (smart auto-advance).
  const newStage = String(formData.get("newStage") ?? "").trim();
  if (newStage && newStage !== kase.stage) kase.stage = newStage;

  const client = db.clients.find((cl) => cl.id === kase.clientId);
  const court = db.courts.find((ct) => ct.id === kase.courtId);
  if (client) {
    await enqueueNotification({
      recipient: `${client.name} (${client.phone})`,
      channel: client.languagePref === "ur" ? "whatsapp" : "sms",
      template: "hearing-update",
      payload: `${kase.title}: ${outcome}${nextDate ? ` — next date ${nextDate} at ${court?.name ?? ""}` : ""}`,
    });
  }
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "case", entityId: kase.number, detail: `Hearing recorded: ${outcome.slice(0, 60)}${newStage ? ` · stage → ${newStage}` : ""}` });
  await persist();
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/diary");
  revalidatePath("/portal");
}

export async function createCase(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const id = uid("k");
  const type = String(formData.get("type")) as "civil" | "criminal" | "family" | "writ" | "appeal";
  db.cases.unshift({
    id, matterThreadId: uid("t"),
    number: String(formData.get("number")),
    type,
    courtId: String(formData.get("courtId")),
    stage: String(formData.get("stage") || "Instituted"),
    title: String(formData.get("title")),
    parties: { plaintiff: String(formData.get("plaintiff")), defendant: String(formData.get("defendant")) },
    clientId: String(formData.get("clientId")),
    assignedUserIds: [user.id],
    status: "active",
    firNo: String(formData.get("firNo") || "") || undefined,
    sections: String(formData.get("sections") || "").split(",").map((s) => s.trim()).filter(Boolean),
    filedOn: new Date().toISOString().slice(0, 10),
  });
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "case", entityId: String(formData.get("number")) });
  await persist();
  revalidatePath("/cases");
  redirect(`/cases/${id}?toast=${encodeURIComponent("Case created")}`);
}

export async function updateCase(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === String(formData.get("id")));
  if (!kase) return;
  kase.number = String(formData.get("number") || kase.number);
  kase.type = String(formData.get("type") || kase.type) as typeof kase.type;
  kase.courtId = String(formData.get("courtId") || kase.courtId);
  kase.stage = String(formData.get("stage") || kase.stage);
  kase.title = String(formData.get("title") || kase.title);
  kase.parties = { plaintiff: String(formData.get("plaintiff")), defendant: String(formData.get("defendant")) };
  kase.clientId = String(formData.get("clientId") || kase.clientId);
  kase.status = String(formData.get("status") || kase.status) as typeof kase.status;
  kase.firNo = String(formData.get("firNo") || "") || undefined;
  kase.sections = String(formData.get("sections") || "").split(",").map((s) => s.trim()).filter(Boolean);
  kase.limitationDate = String(formData.get("limitationDate") || "") || undefined;
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "case", entityId: kase.number, detail: "Case details updated" });
  await persist();
  revalidatePath(`/cases/${kase.id}`);
  revalidatePath("/cases");
  redirect(`/cases/${kase.id}?toast=${encodeURIComponent("Case updated")}`);
}

export async function deleteCase(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const id = String(formData.get("id"));
  const kase = db.cases.find((c) => c.id === id);
  if (!kase) return;
  db.cases = db.cases.filter((c) => c.id !== id);
  db.hearings = db.hearings.filter((h) => h.caseId !== id);
  db.documents = db.documents.filter((d) => d.caseId !== id);
  db.fees = db.fees.filter((f) => f.caseId !== id);
  db.audit.unshift({ id: uid("a"), userId: user.id, userName: user.name, action: "edit", entityType: "case", entityId: kase.number, detail: "Case deleted (with its hearings, documents, fees)", at: new Date().toISOString() });
  await resyncAll();
  revalidatePath("/cases");
  redirect(`/cases?toast=${encodeURIComponent(`Deleted ${kase.title}`)}`);
}

export async function generateDocument(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const caseId = String(formData.get("caseId"));
  const templateType = String(formData.get("templateType"));
  const body = String(formData.get("body"));
  const title = String(formData.get("title"));
  const id = uid("d");
  db.documents.unshift({
    id, caseId, kind: "generated", templateType, title, status: "draft",
    visibility: "firm", body, createdBy: user.id, createdAt: new Date().toISOString(),
  });
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "document", entityId: title });
  await persist();
  redirect(`/documents/${id}`);
}

export async function setDocumentStatus(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === String(formData.get("docId")));
  if (!doc) return;
  const status = String(formData.get("status")) as "draft" | "review" | "filed";
  const visibility = formData.get("visibility") ? (String(formData.get("visibility")) as "firm" | "shared") : doc.visibility;
  doc.status = status;
  doc.visibility = visibility;
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "document", entityId: doc.title, detail: `status=${status}, visibility=${visibility}` });
  await persist();
  revalidatePath(`/documents/${doc.id}`);
  revalidatePath("/documents");
}

export async function recordPayment(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const caseId = String(formData.get("caseId"));
  const kase = db.cases.find((c) => c.id === caseId);
  if (!kase) redirect("/fees");

  // Current outstanding balance for this case (agreed − received so far).
  const fees = db.fees.filter((f) => f.caseId === caseId);
  const agreed = fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
  const already = fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
  const outstanding = agreed - already;

  let amount = Math.round(Number(formData.get("amount")));
  if (!Number.isFinite(amount) || amount <= 0) redirect(`/fees?toast=${encodeURIComponent("Enter a valid payment amount")}`);
  if (outstanding <= 0) redirect(`/fees?toast=${encodeURIComponent(`${kase.title} is already fully paid`)}`);
  amount = Math.min(amount, outstanding); // never record more than the case's balance

  db.fees.push({
    id: uid("f"), caseId, kind: "received", amount,
    method: String(formData.get("method") || "cash") as "cash" | "bank" | "gateway",
    date: new Date().toISOString().slice(0, 10),
    note: String(formData.get("note") || "") || undefined,
    enteredBy: user.id,
  });
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "fees", entityId: kase.number, detail: `Payment received Rs ${amount.toLocaleString("en-PK")}` });
  await persist();
  revalidatePath("/fees");
  revalidatePath(`/cases/${caseId}`);
  const remaining = outstanding - amount;
  redirect(`/fees?toast=${encodeURIComponent(`Recorded Rs ${amount.toLocaleString("en-PK")}${remaining > 0 ? ` — Rs ${remaining.toLocaleString("en-PK")} remaining` : " — fully paid"}`)}`);
}

export async function sendFeeReminder(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === String(formData.get("caseId")));
  if (!kase) redirect("/fees");
  const client = db.clients.find((cl) => cl.id === kase.clientId);
  if (!client) redirect(`/fees?toast=${encodeURIComponent("No client on file for this case")}`);
  await enqueueNotification({
    recipient: `${client.name} (${client.phone})`,
    channel: "whatsapp",
    template: "fee-reminder",
    payload: `Gentle reminder: balance pending in ${kase.title}. Kindly arrange payment at your convenience.`,
  });
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "fees", entityId: kase.number, detail: "Fee reminder queued" });
  await persist();
  revalidatePath("/fees");
  redirect(`/fees?toast=${encodeURIComponent(`Reminder queued to ${client.name}`)}`);
}

export async function setInquiryStatus(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const q = db.inquiries.find((i) => i.id === String(formData.get("inquiryId")));
  if (!q) return;
  q.status = String(formData.get("status")) as typeof q.status;
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "inquiry", entityId: q.callerName, detail: `status=${q.status}` });
  await persist();
  revalidatePath("/inquiries");
}

/** Automation: queue a reminder to every client with a hearing tomorrow (day-before digest). */
export async function notifyTomorrowHearings() {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const hearings = db.hearings.filter((h) => h.date === tomorrow && !h.outcomeNote);
  let sent = 0;
  for (const h of hearings) {
    const kase = db.cases.find((c) => c.id === h.caseId);
    const client = kase && db.clients.find((cl) => cl.id === kase.clientId);
    const court = kase && db.courts.find((ct) => ct.id === kase.courtId);
    if (!kase || !client) continue;
    await enqueueNotification({
      recipient: `${client.name} (${client.phone})`,
      channel: client.languagePref === "ur" ? "whatsapp" : "sms",
      template: "hearing-reminder",
      payload: `Reminder: your hearing in ${kase.title} is tomorrow${h.time ? ` at ${h.time}` : ""}, ${court?.name ?? ""}${court?.room ? ` (${court.room})` : ""}.`,
    });
    sent++;
  }
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "automation", entityId: "day-before-digest", detail: `${sent} hearing reminders queued` });
  revalidatePath("/diary");
  revalidatePath("/settings");
  redirect(`/diary?toast=${encodeURIComponent(`${sent} hearing reminder${sent === 1 ? "" : "s"} queued to clients`)}`);
}

/** Automation: queue a polite reminder to every client with an outstanding balance. */
export async function remindAllOverdue() {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  let sent = 0;
  // Every case with an outstanding balance — matches the "(N)" count on the button
  // (fee collection applies whatever the case's status).
  for (const kase of db.cases) {
    const fees = db.fees.filter((f) => f.caseId === kase.id);
    const bal = fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0) - fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
    if (bal <= 0) continue;
    const client = db.clients.find((cl) => cl.id === kase.clientId);
    if (!client) continue;
    await enqueueNotification({
      recipient: `${client.name} (${client.phone})`,
      channel: "whatsapp",
      template: "fee-reminder",
      payload: `Gentle reminder: a balance of Rs ${bal.toLocaleString("en-PK")} is pending in ${kase.title}. Kindly arrange payment at your convenience.`,
    });
    sent++;
  }
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "automation", entityId: "bulk-fee-reminders", detail: `${sent} fee reminders queued` });
  revalidatePath("/fees");
  revalidatePath("/settings");
  redirect(`/fees?toast=${encodeURIComponent(`${sent} fee reminder${sent === 1 ? "" : "s"} queued`)}`);
}

/** Automation: convert an inquiry into a client (one click). */
export async function convertInquiry(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const q = db.inquiries.find((i) => i.id === String(formData.get("inquiryId")));
  if (!q) return;
  const existing = db.clients.find((c) => c.phone === q.phone);
  if (!existing) {
    db.clients.push({
      id: uid("cl"), name: q.callerName, phone: q.phone,
      languagePref: /[؀-ۿ]/.test(q.summary) ? "ur" : "en",
    });
  }
  q.status = "converted";
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "client", entityId: q.callerName, detail: "Converted from inquiry" });
  await persist();
  revalidatePath("/inquiries");
  revalidatePath("/clients");
  redirect(`/clients?toast=${encodeURIComponent(`${q.callerName} added as a client`)}`);
}

// ---- Clients CRUD -------------------------------------------------------

export async function createClient(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  db.clients.push({
    id: uid("cl"), name,
    cnic: String(formData.get("cnic") || "") || undefined,
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "") || undefined,
    languagePref: (String(formData.get("languagePref") || "en") as "en" | "ur"),
  });
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "client", entityId: name });
  await persist();
  revalidatePath("/clients");
  redirect(`/clients?toast=${encodeURIComponent(`Added ${name}`)}`);
}

export async function updateClient(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const cl = db.clients.find((c) => c.id === String(formData.get("id")));
  if (!cl) return;
  cl.name = String(formData.get("name") || cl.name);
  cl.cnic = String(formData.get("cnic") || "") || undefined;
  cl.phone = String(formData.get("phone") || cl.phone);
  cl.address = String(formData.get("address") || "") || undefined;
  cl.languagePref = (String(formData.get("languagePref") || cl.languagePref) as "en" | "ur");
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "client", entityId: cl.name });
  await persist();
  revalidatePath("/clients");
  redirect(`/clients?toast=${encodeURIComponent("Client updated")}`);
}

export async function deleteClient(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const id = String(formData.get("id"));
  const cl = db.clients.find((c) => c.id === id);
  if (!cl) return;
  if (db.cases.some((c) => c.clientId === id)) {
    redirect(`/clients?toast=${encodeURIComponent("Cannot delete — client has cases. Reassign or delete those first.")}`);
  }
  db.clients = db.clients.filter((c) => c.id !== id);
  db.audit.unshift({ id: uid("a"), userId: user.id, userName: user.name, action: "edit", entityType: "client", entityId: cl.name, detail: "Client deleted", at: new Date().toISOString() });
  await resyncAll();
  revalidatePath("/clients");
  redirect(`/clients?toast=${encodeURIComponent(`Deleted ${cl.name}`)}`);
}

// ---- Hearing edit / delete ---------------------------------------------

export async function updateHearing(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const h = db.hearings.find((x) => x.id === String(formData.get("id")));
  if (!h) return;
  h.date = String(formData.get("date") || h.date);
  h.time = String(formData.get("time") || "") || undefined;
  h.purpose = String(formData.get("purpose") || h.purpose);
  h.outcomeNote = String(formData.get("outcomeNote") || "") || undefined;
  h.readiness = String(formData.get("readiness") || h.readiness) as typeof h.readiness;
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "hearing", entityId: h.caseId, detail: `Hearing ${h.date} edited` });
  await persist();
  revalidatePath(`/cases/${h.caseId}`);
  revalidatePath("/diary");
}

export async function deleteHearing(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const h = db.hearings.find((x) => x.id === String(formData.get("id")));
  if (!h) return;
  const caseId = h.caseId;
  db.hearings = db.hearings.filter((x) => x.id !== h.id);
  db.audit.unshift({ id: uid("a"), userId: user.id, userName: user.name, action: "edit", entityType: "hearing", entityId: caseId, detail: "Hearing deleted", at: new Date().toISOString() });
  await resyncAll();
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/diary");
}

// ---- Document delete ----------------------------------------------------

export async function deleteDocument(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === String(formData.get("id")));
  if (!doc) return;
  const caseId = doc.caseId;
  db.documents = db.documents.filter((d) => d.id !== doc.id);
  db.audit.unshift({ id: uid("a"), userId: user.id, userName: user.name, action: "edit", entityType: "document", entityId: doc.title, detail: "Document deleted", at: new Date().toISOString() });
  await resyncAll();
  revalidatePath("/documents");
  redirect(`/cases/${caseId}?toast=${encodeURIComponent("Document deleted")}`);
}

// ---- Fee entries CRUD ---------------------------------------------------

export async function addFeeEntry(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const caseId = String(formData.get("caseId"));
  const amount = Number(formData.get("amount"));
  const kind = String(formData.get("kind") || "agreed") as "agreed" | "received" | "adjustment";
  if (!amount || amount <= 0) return;
  db.fees.push({
    id: uid("f"), caseId, kind, amount,
    method: kind === "received" ? (String(formData.get("method") || "cash") as "cash" | "bank" | "gateway") : undefined,
    date: new Date().toISOString().slice(0, 10),
    note: String(formData.get("note") || "") || undefined,
    enteredBy: user.id,
  });
  const kase = db.cases.find((c) => c.id === caseId);
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "fees", entityId: kase?.number ?? caseId, detail: `${kind} entry: Rs ${amount.toLocaleString()}` });
  await persist();
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/fees");
}

export async function deleteFeeEntry(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const fee = db.fees.find((f) => f.id === String(formData.get("id")));
  if (!fee) return;
  const caseId = fee.caseId;
  db.fees = db.fees.filter((f) => f.id !== fee.id);
  db.audit.unshift({ id: uid("a"), userId: user.id, userName: user.name, action: "edit", entityType: "fees", entityId: caseId, detail: "Fee entry deleted", at: new Date().toISOString() });
  await resyncAll();
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/fees");
}

// ---- Inquiry create / delete -------------------------------------------

export async function createInquiry(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const name = String(formData.get("callerName") || "").trim();
  if (!name) return;
  db.inquiries.unshift({
    id: uid("q"), channel: "webchat", callerName: name,
    phone: String(formData.get("phone") || "").trim(),
    matterType: String(formData.get("matterType") || "General"),
    summary: String(formData.get("summary") || ""),
    urgency: (String(formData.get("urgency") || "normal") as "normal" | "urgent"),
    status: "new", transcript: [], createdAt: new Date().toISOString(),
  });
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "inquiry", entityId: name });
  await persist();
  revalidatePath("/inquiries");
  redirect(`/inquiries?toast=${encodeURIComponent("Inquiry logged")}`);
}

export async function deleteInquiry(formData: FormData) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const q = db.inquiries.find((i) => i.id === String(formData.get("id")));
  if (!q) return;
  db.inquiries = db.inquiries.filter((i) => i.id !== q.id);
  db.audit.unshift({ id: uid("a"), userId: user.id, userName: user.name, action: "edit", entityType: "inquiry", entityId: q.callerName, detail: "Inquiry deleted", at: new Date().toISOString() });
  await resyncAll();
  revalidatePath("/inquiries");
}

export async function resetDemoData() {
  await requireUser(["admin"]);
  await resetDemo();
  revalidatePath("/");
  redirect("/dashboard");
}

export async function logDocumentView(docId: string) {
  const db = await getDB();
  const user = await requireUser();
  const doc = db.documents.find((d) => d.id === docId);
  if (doc) {
    await audit({ userId: user.id, userName: user.name, action: "view", entityType: "document", entityId: doc.title });
  }
}
