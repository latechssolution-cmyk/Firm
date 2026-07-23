"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDB, persist, uid, audit, enqueueNotification, resetDemo } from "./db";
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
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "case", entityId: kase.number, detail: `Hearing recorded: ${outcome.slice(0, 60)}` });
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
  redirect(`/cases/${id}`);
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
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return;
  db.fees.push({
    id: uid("f"), caseId, kind: "received", amount,
    method: String(formData.get("method") || "cash") as "cash" | "bank" | "gateway",
    date: new Date().toISOString().slice(0, 10),
    note: String(formData.get("note") || "") || undefined,
    enteredBy: user.id,
  });
  const kase = db.cases.find((c) => c.id === caseId);
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "fees", entityId: kase?.number ?? caseId, detail: `Payment received Rs ${amount.toLocaleString()}` });
  await persist();
  revalidatePath("/fees");
  revalidatePath(`/cases/${caseId}`);
}

export async function sendFeeReminder(formData: FormData) {
  const user = await requireUser(["admin", "associate"]);
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === String(formData.get("caseId")));
  if (!kase) return;
  const client = db.clients.find((cl) => cl.id === kase.clientId);
  if (!client) return;
  await enqueueNotification({
    recipient: `${client.name} (${client.phone})`,
    channel: "whatsapp",
    template: "fee-reminder",
    payload: `Gentle reminder: balance pending in ${kase.title}. Kindly arrange payment at your convenience.`,
  });
  await audit({ userId: user.id, userName: user.name, action: "edit", entityType: "fees", entityId: kase.number, detail: "Fee reminder queued" });
  await persist();
  revalidatePath("/fees");
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
