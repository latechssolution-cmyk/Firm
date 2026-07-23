import type { DB, Case, Hearing, FeeEntry, Court } from "./types";

// Deterministic PRNG so the demo tenant is reproducible (PRD §13.4).
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

export function buildSeed(): DB {
  const rnd = mulberry32(20260723);

  const courts: Court[] = [
    { id: "c-hc", type: "HC", name: "Lahore High Court", city: "Lahore", room: "Court 4" },
    { id: "c-hc-rwp", type: "HC", name: "Lahore High Court", bench: "Rawalpindi Bench", city: "Rawalpindi" },
    { id: "c-civ", type: "district-civil", name: "Civil Court", city: "Lahore" },
    { id: "c-sess", type: "sessions", name: "Sessions Court", city: "Lahore" },
    { id: "c-fam", type: "family", name: "Family Court No. 3", city: "Lahore" },
    { id: "c-bank", type: "tribunal", name: "Banking Court I", city: "Lahore" },
  ];

  const users = [
    { id: "u-admin", role: "admin" as const, name: "Adv. Ahmed Raza", phone: "0300-1234567", email: "ahmed@firm.pk" },
    { id: "u-assoc", role: "associate" as const, name: "Adv. Sara Khan", phone: "0301-2223344" },
    { id: "u-clerk", role: "clerk" as const, name: "Munshi Abdul Ghafoor", phone: "0302-5556677" },
    { id: "u-client", role: "client" as const, name: "Muhammad Malik", phone: "0345-9998877", clientId: "cl-malik" },
  ];

  const clients = [
    { id: "cl-malik", name: "Muhammad Malik", cnic: "35202-1234567-1", phone: "0345-9998877", languagePref: "ur" as const },
    { id: "cl-sana", name: "Sana Traders (Pvt) Ltd", phone: "042-35771122", languagePref: "en" as const },
    { id: "cl-khan", name: "Rukhsana Khan", cnic: "35201-7654321-2", phone: "0333-1112233", languagePref: "ur" as const },
    { id: "cl-city", name: "City Builders", phone: "042-36664455", languagePref: "en" as const },
    { id: "cl-wp", name: "Tariq Mehmood", cnic: "61101-9988776-5", phone: "0321-4455667", languagePref: "en" as const },
  ];

  const hero: Case[] = [
    {
      id: "k-malik", matterThreadId: "t-malik", number: "Crl. Misc. No. 18600-B/2026", type: "criminal",
      courtId: "c-hc", stage: "Bail — order reserved", title: "Malik vs. State",
      parties: { plaintiff: "Muhammad Malik", defendant: "The State" }, clientId: "cl-malik",
      assignedUserIds: ["u-admin", "u-assoc"], status: "active",
      firNo: "412/2026", policeStation: "PS Gulberg", sections: ["302/34 PPC"], filedOn: addDays(-21),
    },
    {
      id: "k-sana", matterThreadId: "t-sana", number: "C.S. No. 337/2026", type: "civil",
      courtId: "c-civ", stage: "Evidence (plaintiff)", title: "Sana Traders v. Metro Corporation",
      parties: { plaintiff: "Sana Traders", defendant: "Metro Corporation" }, clientId: "cl-sana",
      assignedUserIds: ["u-admin"], status: "active", filedOn: addDays(-140), limitationDate: addDays(9),
    },
    {
      id: "k-khan", matterThreadId: "t-khan", number: "Family Suit No. 88/2026", type: "family",
      courtId: "c-fam", stage: "Arguments", title: "Khan Family — Guardianship",
      parties: { plaintiff: "Rukhsana Khan", defendant: "Imran Khan" }, clientId: "cl-khan",
      assignedUserIds: ["u-assoc"], status: "active", filedOn: addDays(-95),
    },
    {
      id: "k-city", matterThreadId: "t-city", number: "R.F.A. No. 51/2026", type: "appeal",
      courtId: "c-sess", stage: "Order awaited", title: "City Builders — Appeal",
      parties: { plaintiff: "City Builders", defendant: "Naveed & Sons" }, clientId: "cl-city",
      assignedUserIds: ["u-admin"], status: "active", filedOn: addDays(-60), linkedCaseId: "k-city-trial",
    },
    {
      id: "k-city-trial", matterThreadId: "t-city", number: "C.S. No. 902/2025", type: "civil",
      courtId: "c-civ", stage: "Decreed", title: "City Builders v. Naveed & Sons (trial)",
      parties: { plaintiff: "City Builders", defendant: "Naveed & Sons" }, clientId: "cl-city",
      assignedUserIds: ["u-admin"], status: "decided", filedOn: "2025-03-12", decidedOn: addDays(-120),
    },
    {
      id: "k-wp", matterThreadId: "t-wp", number: "W.P. No. 4412/2026", type: "writ",
      courtId: "c-hc", stage: "Comments awaited", title: "Tariq Mehmood v. Federation",
      parties: { plaintiff: "Tariq Mehmood", defendant: "Federation of Pakistan" }, clientId: "cl-wp",
      assignedUserIds: ["u-admin", "u-assoc"], status: "active", filedOn: addDays(-30),
    },
  ];

  // Filler to reach 86 active cases (5 hero active + k-city-trial decided).
  const stagesByType: Record<string, string[]> = {
    civil: ["Plaint filed", "Written statement", "Issues framed", "Evidence (plaintiff)", "Evidence (defendant)", "Arguments"],
    criminal: ["Bail (post-arrest)", "Challan submitted", "Charge framed", "Prosecution evidence", "Arguments"],
    family: ["Pre-trial reconciliation", "Evidence", "Arguments", "Post-trial reconciliation"],
    writ: ["Notice issued", "Comments awaited", "Arguments"],
    appeal: ["Notice issued", "Record requisitioned", "Arguments", "Order awaited"],
  };
  const surnames = ["Ahmed", "Butt", "Cheema", "Dar", "Farooq", "Gill", "Hashmi", "Iqbal", "Javed", "Kayani", "Lodhi", "Mirza", "Nawaz", "Qureshi", "Rathore", "Sheikh", "Tarar", "Usman", "Virk", "Yousaf"];
  const types: Case["type"][] = ["civil", "civil", "civil", "criminal", "criminal", "family", "writ", "appeal"];
  const courtByType: Record<string, string[]> = {
    civil: ["c-civ", "c-bank"], criminal: ["c-sess", "c-hc"], family: ["c-fam"], writ: ["c-hc", "c-hc-rwp"], appeal: ["c-sess", "c-hc"],
  };
  const prefixByType: Record<string, string> = {
    civil: "C.S. No.", criminal: "Crl. Misc. No.", family: "Family Suit No.", writ: "W.P. No.", appeal: "R.F.A. No.",
  };

  const filler: Case[] = [];
  for (let i = 0; i < 81; i++) {
    const type = types[Math.floor(rnd() * types.length)];
    const stageList = stagesByType[type];
    const s1 = surnames[Math.floor(rnd() * surnames.length)];
    let s2 = surnames[Math.floor(rnd() * surnames.length)];
    if (s2 === s1) s2 = surnames[(surnames.indexOf(s1) + 3) % surnames.length];
    const courts_ = courtByType[type];
    const num = 100 + Math.floor(rnd() * 8900);
    filler.push({
      id: `k-f${i}`, matterThreadId: `t-f${i}`,
      number: `${prefixByType[type]} ${num}/2026`, type,
      courtId: courts_[Math.floor(rnd() * courts_.length)],
      stage: stageList[Math.floor(rnd() * stageList.length)],
      title: type === "criminal" ? `${s1} vs. State` : `${s1} v. ${s2}`,
      parties: { plaintiff: s1, defendant: type === "criminal" ? "The State" : s2 },
      // Filler cases go to non-portal clients only, so the client-portal demo stays focused.
      clientId: clients[1 + Math.floor(rnd() * (clients.length - 1))].id,
      assignedUserIds: [rnd() > 0.5 ? "u-admin" : "u-assoc"],
      status: "active", filedOn: addDays(-Math.floor(rnd() * 300)),
    });
  }

  const cases = [...hero, ...filler];

  // Hearings: history for hero cases + exactly 7 tomorrow (4 hero + 3 filler) + spread across next 30 days.
  const hearings: Hearing[] = [
    { id: "h-m1", caseId: "k-malik", date: addDays(-2), purpose: "Arguments on bail", outcomeNote: "Arguments heard — order reserved", nextDate: addDays(1), readiness: "ready", enteredBy: "u-clerk", enteredAt: addDays(-2) },
    { id: "h-m2", caseId: "k-malik", date: addDays(-9), purpose: "Reply submission", outcomeNote: "Reply submitted to court; copy shared with client", nextDate: addDays(-2), readiness: "na", enteredBy: "u-clerk", enteredAt: addDays(-9) },
    { id: "h-m3", caseId: "k-malik", date: addDays(-21), purpose: "Institution", outcomeNote: "Case filed & number assigned", nextDate: addDays(-9), readiness: "na", enteredBy: "u-clerk", enteredAt: addDays(-21) },
    { id: "h-t1", caseId: "k-malik", date: addDays(1), time: "09:30", purpose: "Bail — order", readiness: "ready", enteredBy: "u-clerk", enteredAt: addDays(-2) },
    { id: "h-t2", caseId: "k-sana", date: addDays(1), time: "10:00", purpose: "Evidence — witness listed", readiness: "ready", enteredBy: "u-clerk", enteredAt: addDays(-7) },
    { id: "h-t3", caseId: "k-khan", date: addDays(1), time: "11:00", purpose: "Arguments — draft attached", readiness: "pending", enteredBy: "u-clerk", enteredAt: addDays(-6) },
    { id: "h-t4", caseId: "k-city", date: addDays(1), time: "12:00", purpose: "Order awaited", readiness: "ready", enteredBy: "u-clerk", enteredAt: addDays(-5) },
  ];
  for (let i = 0; i < 3; i++) {
    hearings.push({ id: `h-tf${i}`, caseId: `k-f${i * 7}`, date: addDays(1), time: `${9 + i}:30`, purpose: "Hearing", readiness: i === 1 ? "pending" : "ready", enteredBy: "u-clerk", enteredAt: addDays(-3) });
  }
  for (let i = 0; i < 60; i++) {
    const c = filler[Math.floor(rnd() * filler.length)];
    hearings.push({ id: `h-x${i}`, caseId: c.id, date: addDays(2 + Math.floor(rnd() * 28)), purpose: "Hearing", readiness: "pending", enteredBy: "u-clerk", enteredAt: addDays(-1) });
  }

  // Fees: pending total = Rs 940,000 exactly (agreed − received).
  const fees: FeeEntry[] = [
    { id: "f-1", caseId: "k-malik", kind: "agreed", amount: 300000, date: addDays(-21), enteredBy: "u-admin" },
    { id: "f-2", caseId: "k-malik", kind: "received", amount: 260000, method: "bank", date: addDays(-14), enteredBy: "u-clerk" },
    { id: "f-3", caseId: "k-sana", kind: "agreed", amount: 800000, date: addDays(-140), enteredBy: "u-admin" },
    { id: "f-4", caseId: "k-sana", kind: "received", amount: 400000, method: "bank", date: addDays(-60), enteredBy: "u-clerk" },
    { id: "f-5", caseId: "k-khan", kind: "agreed", amount: 150000, date: addDays(-95), enteredBy: "u-admin" },
    { id: "f-6", caseId: "k-khan", kind: "received", amount: 100000, method: "cash", date: addDays(-40), enteredBy: "u-clerk" },
    { id: "f-7", caseId: "k-city", kind: "agreed", amount: 500000, date: addDays(-60), enteredBy: "u-admin" },
    { id: "f-8", caseId: "k-city", kind: "received", amount: 150000, method: "bank", date: addDays(-30), enteredBy: "u-clerk" },
    { id: "f-9", caseId: "k-wp", kind: "agreed", amount: 200000, date: addDays(-30), enteredBy: "u-admin" },
    { id: "f-10", caseId: "k-wp", kind: "received", amount: 200000, method: "bank", date: addDays(-20), enteredBy: "u-clerk" },
  ]; // pending: 40k + 400k + 50k + 350k + 0 = 840k → add one more
  fees.push({ id: "f-11", caseId: "k-f2", kind: "agreed", amount: 100000, date: addDays(-50), enteredBy: "u-admin" }); // total pending 940k

  const documents = [
    { id: "d-1", caseId: "k-malik", kind: "generated" as const, templateType: "bail-post", title: "Bail Application (s.497 CrPC)", status: "filed" as const, visibility: "shared" as const, createdBy: "u-assoc", createdAt: addDays(-20) },
    { id: "d-2", caseId: "k-malik", kind: "generated" as const, templateType: "vakalatnama", title: "Vakalatnama", status: "filed" as const, visibility: "shared" as const, createdBy: "u-clerk", createdAt: addDays(-21) },
    { id: "d-3", caseId: "k-sana", kind: "uploaded" as const, title: "Order sheet 14-Jun-2026 (scan)", status: "filed" as const, visibility: "firm" as const, createdBy: "u-clerk", createdAt: addDays(-38) },
    { id: "d-4", caseId: "k-khan", kind: "generated" as const, templateType: "legal-notice", title: "Legal Notice", status: "review" as const, visibility: "firm" as const, createdBy: "u-assoc", createdAt: addDays(-5) },
  ];

  const inquiries = [
    {
      id: "q-1", channel: "webchat" as const, callerName: "Waqar Ali", phone: "0311-7788990",
      matterType: "Criminal — detention", summary: "Brother detained this evening by police, family seeking urgent bail help.",
      urgency: "urgent" as const, callbackSlot: `${addDays(1)} 08:30`, status: "new" as const,
      transcript: [
        { from: "assistant" as const, text: "Assalam-o-alaikum! You've reached the chambers. How can I help you today?" },
        { from: "caller" as const, text: "I need a lawyer urgently — my brother was detained this evening." },
        { from: "assistant" as const, text: "I understand — this sounds urgent. The advocate handles criminal matters. I've booked a callback for 8:30 AM tomorrow and flagged this as urgent right now." },
      ],
      createdAt: addDays(0),
    },
    {
      id: "q-2", channel: "webchat" as const, callerName: "Nadia Hussain", phone: "0322-4455112",
      matterType: "Family — khula", summary: "Wants consultation about khula procedure and maintenance for two children.",
      urgency: "normal" as const, callbackSlot: `${addDays(2)} 15:00`, status: "contacted" as const,
      transcript: [], createdAt: addDays(-1),
    },
  ];

  return {
    firm: { name: "Raza & Associates", nameUrdu: "رضا اینڈ ایسوسی ایٹس", tagline: "Advocates & Legal Consultants" },
    users, courts, clients, cases, hearings, documents, fees, inquiries,
    notifications: [
      { id: "n-1", recipient: "Muhammad Malik (0345-9998877)", channel: "sms" as const, template: "hearing-update", payload: "Next date in Malik vs. State: tomorrow 9:30 AM, Lahore High Court Court 4.", status: "queued" as const, note: "No SMS gateway configured — see Settings → Integrations", createdAt: addDays(0) },
    ],
    audit: [
      { id: "a-1", userId: "u-admin", userName: "Adv. Ahmed Raza", action: "login" as const, entityType: "session", entityId: "-", at: new Date().toISOString() },
    ],
  };
}
