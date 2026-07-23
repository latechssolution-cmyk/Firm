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
    <div className="themed flex h-[480px] flex-col rounded-lg border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}>
      <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: "var(--color-border-subtle)" }}>
        <span className="text-sm font-bold">AI RECEPTIONIST · LIVE</span>
        {urgent && <span className="text-xs font-bold" style={{ color: "var(--color-danger)" }}>⚑ FLAGGED URGENT</span>}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm"
              style={
                m.from === "assistant"
                  ? { background: "var(--color-muted-bg)", alignSelf: "flex-start" }
                  : { background: "var(--color-primary)", color: "var(--color-on-primary)", alignSelf: "flex-end" }
              }
            >
              {m.text}
            </div>
          ))}
          {busy && <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>typing…</div>}
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
        <button type="submit" disabled={busy || !input.trim()} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
