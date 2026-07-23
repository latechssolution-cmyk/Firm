/** Minimal line icons — inherit currentColor, so they theme automatically. */
type P = { className?: string; size?: number };
const s = (size = 16) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const IconDashboard = ({ size, className }: P) => (<svg {...s(size)} className={className}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>);
export const IconCases = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>);
export const IconDiary = ({ size, className }: P) => (<svg {...s(size)} className={className}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
export const IconClients = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>);
export const IconDocs = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>);
export const IconFees = ({ size, className }: P) => (<svg {...s(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M9 8h6M9 8c3 0 4 5 0 5h5M9 13l4 4" /></svg>);
export const IconInquiries = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>);
export const IconAudit = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>);
export const IconSettings = ({ size, className }: P) => (<svg {...s(size)} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>);
export const IconAlert = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>);
export const IconClock = ({ size, className }: P) => (<svg {...s(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconSparkle = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9Z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" /></svg>);
export const IconCheck = ({ size, className }: P) => (<svg {...s(size)} className={className}><path d="M20 6 9 17l-5-5" /></svg>);

export const navIcon: Record<string, (p: P) => JSX.Element> = {
  "/dashboard": IconDashboard, "/cases": IconCases, "/diary": IconDiary, "/clients": IconClients,
  "/documents": IconDocs, "/fees": IconFees, "/inquiries": IconInquiries, "/audit": IconAudit, "/settings": IconSettings,
};
