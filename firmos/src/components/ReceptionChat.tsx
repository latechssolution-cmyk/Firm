"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "caller" | "assistant"; text: string };

export function ReceptionChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [state, setState] = useState<unknown>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  async function send(history: Msg[]) {
    setBusy(true);
    const res = await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, state }),
    });
    const data = await res.json();
    setMessages([...history, { from: "assistant", text: data.reply }]);
    setState(data.state);
    setUrgent(data.urgentFlag);
    setBusy(false);
  }

  useEffect(() => {
    if (!started.current) { started.current = true; void send([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const history: Msg[] = [...messages, { from: "caller", text: input.trim() }];
    setMessages(history);
    setInput("");
    void send(history);
  }

  return (
    <div className="themed card flex h-[480px] flex-col rounded-2xl border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-border-subtle)" }}>
        <span className="flex items-center gap-2 text-sm font-bold">
          <span className="live-dot h-2 w-2 rounded-full" style={{ background: "var(--color-success)" }} />
          AI Receptionist · Live
        </span>
        {urgent && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase" style={{ color: "var(--color-danger)", background: "color-mix(in srgb, var(--color-danger) 12%, transparent)" }}>⚑ Urgent</span>}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.from === "assistant" ? "" : "flex-row-reverse"}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={m.from === "assistant"
                  ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
                  : { background: "var(--color-muted-bg)", color: "var(--color-text-secondary)" }}>
                {m.from === "assistant" ? "AI" : "You"}
              </span>
              <div className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm"
                style={m.from === "assistant"
                  ? { background: "var(--color-muted-bg)", borderBottomLeftRadius: 4 }
                  : { background: "var(--color-primary)", color: "var(--color-on-primary)", borderBottomRightRadius: 4 }}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>AI</span>
              <div className="rounded-2xl px-3.5 py-2.5" style={{ background: "var(--color-muted-bg)" }}>
                <span className="typing-dots" aria-label="typing"><i></i><i></i><i></i></span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message… (English یا اردو)"
          aria-label="Message"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()} className="themed rounded-full px-4 py-2 text-sm font-semibold btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
