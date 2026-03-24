"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import {
  useAskAttyMutation,
  useSubmitAttySupportMutation,
} from "@/services/api/attyApi";

const QUICK_QUESTIONS = [
  "How do I punch in?",
  "Why is my location rejected?",
  "How do I view my attendance?",
  "What is my subscription status?",
  "How do I manage my team?",
  "How do I generate reports?",
];

const CHAT_THEME = {
  light: {
    panel: "bg-[#ffffff] border-[#e5e7eb] text-[#0f172a]",
    headerSubtle: "text-[#dbeafe]",
    statusText: "text-white/70",
    introBubble: "bg-[#f3f4f6] border border-[#e5e7eb] text-[#1f2937]",
    botBubble: "bg-[#f3f4f6] border border-[#e5e7eb] text-[#1f2937]",
    loaderBubble: "bg-[#f3f4f6] border border-[#e5e7eb]",
    loaderDot: "bg-[#9ca3af]",
    messages: "bg-[#ffffff]",
    section: "bg-[#f9fafb] border-[#f3f4f6]",
    sectionText: "text-[#9ca3af]",
    quickButton:
      "border-[#e5e7eb] bg-[#ffffff] text-[#374151] hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50",
    inputWrap: "border-[#e5e7eb] bg-[#ffffff]",
    input:
      "atty-widget-field border-[#e5e7eb] bg-[#ffffff] text-[#1f2937] placeholder:text-[#9ca3af] focus:border-blue-400",
    supportCard: "bg-[#f9fafb] border-[#e5e7eb] text-[#111827]",
    supportTitle: "text-[#1f2937]",
    supportLabel: "text-[#6b7280]",
    supportReadonly:
      "atty-widget-field border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]",
    supportEditable:
      "atty-widget-field border-[#e5e7eb] bg-[#ffffff] text-[#1f2937] placeholder:text-[#9ca3af] focus:border-blue-400",
    supportNote: "text-[#9ca3af]",
    successBox: "bg-green-50 border border-green-200 text-green-800",
    successText: "text-green-700",
    avatarBorder: "border-blue-100",
  },
  dark: {
    panel: "bg-[#0b1220] border-[#243041] text-[#f8fafc]",
    headerSubtle: "text-white/65",
    statusText: "text-white/70",
    introBubble: "bg-[#111827] border border-[#243041] text-[#e5eefb]",
    botBubble: "bg-[#111827] border border-[#243041] text-[#e5eefb]",
    loaderBubble: "bg-[#111827] border border-[#243041]",
    loaderDot: "bg-[#7c8aa0]",
    messages: "bg-[#0b1220]",
    section: "bg-[#111827] border-[#243041]",
    sectionText: "text-[#94a3b8]",
    quickButton:
      "border-[#243041] bg-[#0f172a] text-[#dbe7f5] hover:border-blue-400/60 hover:text-white hover:bg-[#172033]",
    inputWrap: "border-[#243041] bg-[#0b1220]",
    input:
      "atty-widget-field atty-widget-field-dark border-[#243041] bg-[#111827] text-[#e5eefb] placeholder:text-[#7c8aa0] focus:border-blue-400",
    supportCard: "bg-[#111827] border-[#243041] text-[#f8fafc]",
    supportTitle: "text-[#f8fafc]",
    supportLabel: "text-[#94a3b8]",
    supportReadonly:
      "atty-widget-field atty-widget-field-dark border-[#243041] bg-[#0f172a] text-[#94a3b8]",
    supportEditable:
      "atty-widget-field atty-widget-field-dark border-[#243041] bg-[#0b1220] text-[#e5eefb] placeholder:text-[#7c8aa0] focus:border-blue-400",
    supportNote: "text-[#64748b]",
    successBox: "bg-emerald-500/10 border border-emerald-500/25 text-emerald-100",
    successText: "text-emerald-200",
    avatarBorder: "border-blue-400/30",
  },
};

function BotAvatar({ avatarBorder }) {
  return (
    <div
      className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border ${avatarBorder}`}
    >
      <Image
        src="/Logo.webp"
        alt="Atty"
        width={28}
        height={28}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function getInitialSupportForm() {
  if (typeof window === "undefined") {
    return {
      name: "",
      email: "",
      role: "",
      subject: "",
      message: "",
    };
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem("user") || "{}");
    return {
      name: stored.name || "",
      email: stored.email || "",
      role: stored.role || "",
      subject: "",
      message: "",
    };
  } catch (_) {
    return {
      name: "",
      email: "",
      role: "",
      subject: "",
      message: "",
    };
  }
}

function SupportForm({ onSubmit, loading, theme }) {
  const [form, setForm] = useState(getInitialSupportForm);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Name, email and message are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    const result = await onSubmit(form);
    if (result?.success) {
      setDone(true);
      setTicketId(result.ticketId);
      return;
    }

    setError(result?.error || "Something went wrong. Please try again.");
  };

  if (done) {
    return (
      <div className={`rounded-xl p-3 text-sm ${theme.successBox}`}>
        <p className="font-medium">Query submitted</p>
        <p className={`mt-0.5 text-xs ${theme.successText}`}>
          Ticket #{ticketId} created. We will reply to {form.email} within 24
          hours.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 rounded-xl border p-3 text-sm ${theme.supportCard}`}>
      <p className={`mb-2 font-medium ${theme.supportTitle}`}>Contact support</p>
      <div className="flex flex-col gap-2">
        <div>
          <label className={`mb-1 block text-[11px] ${theme.supportLabel}`}>
            Name
          </label>
          <input
            type="text"
            value={form.name}
            readOnly
            className={`w-full rounded-md px-2.5 py-1.5 text-xs cursor-not-allowed focus:outline-none ${theme.supportReadonly}`}
          />
        </div>

        <div>
          <label className={`mb-1 block text-[11px] ${theme.supportLabel}`}>
            Email
          </label>
          <input
            type="email"
            value={form.email}
            readOnly
            className={`w-full rounded-md px-2.5 py-1.5 text-xs cursor-not-allowed focus:outline-none ${theme.supportReadonly}`}
          />
        </div>

        <div>
          <label className={`mb-1 block text-[11px] ${theme.supportLabel}`}>
            Role
          </label>
          <input
            type="text"
            value={form.role}
            readOnly
            className={`w-full rounded-md px-2.5 py-1.5 text-xs cursor-not-allowed focus:outline-none ${theme.supportReadonly}`}
          />
        </div>

        <div>
          <label className={`mb-1 block text-[11px] ${theme.supportLabel}`}>
            Subject
          </label>
          <input
            type="text"
            value={form.subject}
            onChange={set("subject")}
            placeholder="Brief topic"
            className={`w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none ${theme.supportEditable}`}
          />
        </div>

        <div>
          <label className={`mb-1 block text-[11px] ${theme.supportLabel}`}>
            Message *
          </label>
          <textarea
            value={form.message}
            onChange={set("message")}
            placeholder="Describe your issue..."
            rows={3}
            className={`w-full resize-none rounded-md px-2.5 py-1.5 text-xs focus:outline-none ${theme.supportEditable}`}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-md bg-[#185FA5] py-2 text-xs font-medium text-white transition-colors hover:bg-[#0C447C] disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send to support"}
        </button>

        <p className={`text-center text-[11px] ${theme.supportNote}`}>
          We reply within 24 hours
        </p>
      </div>
    </div>
  );
}

export default function AttyWidget() {
  const { isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const bottomRef = useRef(null);

  const theme = CHAT_THEME[isDarkMode ? "dark" : "light"];
  const widgetModeClass = isDarkMode
    ? "atty-widget atty-widget--dark"
    : "atty-widget atty-widget--light";

  const [askAtty, { isLoading: chatLoading }] = useAskAttyMutation();
  const [submitSupport, { isLoading: formLoading }] =
    useSubmitAttySupportMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, showForm]);

  const addMsg = (role, content, extra = {}) =>
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), role, content, ...extra },
    ]);

  const closeChat = () => {
    setOpen(false);
    setMessages([]);
    setInput("");
    setShowForm(false);
  };

  const handleAsk = async (question) => {
    if (!question.trim() || chatLoading) return;

    setInput("");
    setShowForm(false);
    addMsg("user", question);

    try {
      const data = await askAtty(question).unwrap();
      addMsg("bot", data.answer);
      if (data.showForm) setShowForm(true);
    } catch {
      addMsg(
        "bot",
        "I am having trouble connecting. Please try again or use the support form below.",
      );
      setShowForm(true);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const data = await submitSupport(formData).unwrap();
      setShowForm(false);
      return { success: true, ticketId: data.ticketId };
    } catch (err) {
      return {
        success: false,
        error: err?.data?.message || "Failed to submit.",
      };
    }
  };

  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAsk(input);
    }
  };

  return (
    <>
      {open && (
        <div
          className={`fixed bottom-24 right-5 z-50 flex max-h-[590px] w-[370px] flex-col overflow-hidden rounded-2xl border shadow-xl ${widgetModeClass} ${theme.panel}`}
        >
          <div className="flex flex-shrink-0 items-center gap-3 bg-[#185FA5] px-4 py-3">
            <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
              <Image
                src="/Logo.webp"
                alt="Atty"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-white">Atty</p>
              <p className={`text-[11px] ${theme.headerSubtle}`}>
                Attendee Support Bot
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className={`text-[11px] ${theme.statusText}`}>
                  Always on
                </span>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="text-xl leading-none text-white/60 hover:text-white"
              aria-label="Close Atty support"
            >
              ×
            </button>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 ${theme.messages}`}
          >
            {messages.length === 0 && (
              <div className="flex items-start gap-2">
                <BotAvatar avatarBorder={theme.avatarBorder} />
                <div
                  className={`max-w-[84%] rounded-xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed ${theme.introBubble}`}
                >
                  Hi. Ask me anything about Attendee and I will get you an
                  answer fast.
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.role === "user"
                    ? "flex-row-reverse items-start"
                    : "items-start"
                }`}
              >
                {msg.role === "bot" && (
                  <BotAvatar avatarBorder={theme.avatarBorder} />
                )}
                <div
                  className={`max-w-[84%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-[#185FA5] text-white"
                      : `${theme.botBubble} rounded-tl-sm`
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-start gap-2">
                <BotAvatar avatarBorder={theme.avatarBorder} />
                <div
                  className={`rounded-xl rounded-tl-sm px-3 py-2 ${theme.loaderBubble}`}
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 animate-bounce rounded-full ${theme.loaderDot}`}
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showForm && (
              <div className="flex items-start gap-2">
                <BotAvatar avatarBorder={theme.avatarBorder} />
                <SupportForm
                  onSubmit={handleFormSubmit}
                  loading={formLoading}
                  theme={theme}
                />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {messages.length === 0 && (
            <div className={`flex-shrink-0 border-t px-4 pb-3 ${theme.section}`}>
              <p className={`mb-1.5 mt-2 text-[11px] ${theme.sectionText}`}>
                Quick questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] transition-colors ${theme.quickButton}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`flex flex-shrink-0 gap-2 border-t px-3 py-2.5 ${theme.inputWrap}`}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Atty anything..."
              className={`max-h-20 flex-1 resize-none overflow-y-auto rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.input}`}
            />
            <button
              onClick={() => handleAsk(input)}
              disabled={!input.trim() || chatLoading}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#185FA5] transition-colors hover:bg-[#0C447C] disabled:opacity-40"
            >
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (open) {
            closeChat();
          } else {
            setOpen(true);
          }
        }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#185FA5] shadow-lg transition-all hover:scale-105 hover:bg-[#0C447C] active:scale-95"
        aria-label="Open Atty support"
      >
        {open ? (
          <svg className="h-6 w-6 fill-white" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg className="h-6 w-6 fill-white" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        )}
      </button>
    </>
  );
}
