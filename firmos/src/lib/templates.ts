import type { Case, ClientParty, Court } from "./db/types";

export interface Template {
  id: string;
  name: string;
  description: string;
  render: (c: Case, client: ClientParty | undefined, court: Court | undefined, firm: string) => string;
}

const header = (court: Court | undefined, c: Case) =>
  `IN THE ${(court ? `${court.name.toUpperCase()}${court.bench ? `, ${court.bench.toUpperCase()}` : ""}` : "COURT")}\n\n${c.number}\n\n${c.parties.plaintiff}  …Petitioner\nVERSUS\n${c.parties.defendant}  …Respondent\n`;

export const TEMPLATES: Template[] = [
  {
    id: "vakalatnama",
    name: "Vakalatnama",
    description: "Power of attorney authorizing the advocate — first filing in every case.",
    render: (c, client, court, firm) =>
      `${header(court, c)}
VAKALATNAMA

I/We, ${client?.name ?? c.parties.plaintiff}${client?.cnic ? ` (CNIC ${client.cnic})` : ""}, do hereby appoint and constitute ${firm}, Advocates, to appear, plead and act on my/our behalf in the above-noted matter, with authority to file and withdraw proceedings, to deposit and receive documents, and to do all lawful acts incidental thereto.

Dated: ____________

ACCEPTED:
______________________          ______________________
Signature of Client             Advocate
${firm}`,
  },
  {
    id: "bail-post",
    name: "Bail Application (post-arrest, s.497 CrPC)",
    description: "For an accused already under arrest.",
    render: (c, client, court, firm) =>
      `${header(court, c)}
APPLICATION FOR POST-ARREST BAIL UNDER SECTION 497 Cr.P.C.
${c.firNo ? `(FIR No. ${c.firNo}${c.policeStation ? `, ${c.policeStation}` : ""}${c.sections?.length ? `, offence u/s ${c.sections.join(", ")}` : ""})` : ""}

RESPECTFULLY SHEWETH:

1. That the petitioner has been falsely implicated in the above-noted FIR; the allegations are baseless and concocted.
2. That the petitioner is not required for further investigation; nothing is to be recovered from him.
3. That the case against the petitioner requires further inquiry within the meaning of s.497(2) Cr.P.C.
4. That the petitioner undertakes to furnish sound surety and abide by all terms imposed by this Hon'ble Court.

PRAYER: It is therefore respectfully prayed that the petitioner may kindly be admitted to post-arrest bail in the interest of justice.

Petitioner through counsel,
${firm}`,
  },
  {
    id: "bail-pre",
    name: "Bail Application (pre-arrest, s.498 CrPC)",
    description: "Protective bail before arrest.",
    render: (c, client, court, firm) =>
      `${header(court, c)}
APPLICATION FOR PRE-ARREST BAIL UNDER SECTION 498 Cr.P.C.

RESPECTFULLY SHEWETH:

1. That the petitioner apprehends arrest at the hands of police in the above-noted matter on mala fide grounds.
2. That the intended arrest is actuated by ulterior motives and would cause irreparable harm to the petitioner's reputation.
3. That the petitioner is ready to join the investigation and to furnish surety to the satisfaction of this Hon'ble Court.

PRAYER: It is respectfully prayed that ad-interim pre-arrest bail may kindly be confirmed in the interest of justice.

Petitioner through counsel,
${firm}`,
  },
  {
    id: "legal-notice",
    name: "Legal Notice",
    description: "Pre-litigation demand notice.",
    render: (c, client, _court, firm) =>
      `LEGAL NOTICE

To: ${c.parties.defendant}

On behalf of and under instructions from my client, ${client?.name ?? c.parties.plaintiff}, I hereby serve you with the following notice:

1. [State the facts giving rise to the claim.]
2. [State the demand and the legal basis.]

You are called upon to satisfy the above demand within fourteen (14) days of receipt of this notice, failing which my client shall be constrained to initiate appropriate civil and/or criminal proceedings against you at your sole risk as to costs and consequences.

${firm}
Advocates & Legal Consultants`,
  },
  {
    id: "plaint",
    name: "Plaint (CPC Order VII)",
    description: "Civil suit opening pleading.",
    render: (c, client, court, firm) =>
      `${header(court, c)}
PLAINT

RESPECTFULLY SHEWETH:

1. That the plaintiff is [description]; the defendant is [description].
2. That the cause of action accrued on [date] at [place] when [facts].
3. That this Hon'ble Court has jurisdiction as [basis]; court fee of Rs [amount] is affixed.

PRAYER: It is respectfully prayed that a decree may kindly be passed in favour of the plaintiff as under: [relief], with costs.

Plaintiff through counsel,
${firm}`,
  },
];
