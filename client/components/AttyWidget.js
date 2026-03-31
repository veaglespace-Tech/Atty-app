"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageSquareText, SendHorizontal, X } from "lucide-react";
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
    panel:
      "light-glow-card-static border border-white/80 text-slate-900 shadow-[0_28px_80px_rgba(30,112,209,0.18)]",
    header:
      "bg-[linear-gradient(135deg,rgba(12,68,124,0.98),rgba(30,112,209,0.96),rgba(92,209,229,0.88))]",
    headerSubtle: "text-white/80",
    statusText: "text-white/72",
    introBubble:
      "border border-[rgb(var(--brand-line)/0.7)] bg-white/92 text-slate-700 shadow-[0_18px_38px_rgba(30,112,209,0.08)]",
    botBubble:
      "border border-[rgb(var(--brand-line)/0.72)] bg-[rgb(var(--brand-surface)/0.92)] text-slate-700 shadow-[0_18px_38px_rgba(30,112,209,0.08)]",
    userBubble:
      "bg-[linear-gradient(135deg,rgba(12,68,124,0.98),rgba(30,112,209,0.96))] text-white shadow-[0_18px_40px_rgba(30,112,209,0.22)]",
    loaderBubble:
      "border border-[rgb(var(--brand-line)/0.7)] bg-white/92 shadow-[0_18px_38px_rgba(30,112,209,0.08)]",
    loaderDot: "bg-[rgb(var(--brand-blue))]",
    messages: "bg-transparent",
    section: "border-white/70 bg-white/68 backdrop-blur-xl",
    sectionText: "text-slate-500",
    quickButton:
      "brand-btn brand-btn-secondary brand-btn-sm w-full justify-center rounded-full px-3 py-1.5 text-center text-[11px] font-black tracking-[0.04em] sm:w-auto",
    inputWrap: "border-white/70 bg-white/68 backdrop-blur-xl",
    input:
      "atty-widget-field border-[rgb(var(--brand-line)/0.76)] bg-white/90 text-slate-800 placeholder:text-slate-400 shadow-[0_12px_30px_rgba(30,112,209,0.08)] focus:border-blue-500",
    sendButton:
      "brand-btn brand-btn-primary flex h-11 w-full flex-shrink-0 items-center justify-center rounded-[1.1rem] p-0 disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-2xl",
    supportCard:
      "border border-white/70 bg-white/78 text-slate-800 shadow-[0_22px_54px_rgba(30,112,209,0.10)] backdrop-blur-xl",
    supportTitle: "text-slate-900",
    supportLabel: "text-slate-500",
    supportReadonly:
      "atty-widget-field border-[rgb(var(--brand-line)/0.66)] bg-[rgb(var(--brand-surface-soft)/0.88)] text-slate-500",
    supportEditable:
      "atty-widget-field border-[rgb(var(--brand-line)/0.76)] bg-white/90 text-slate-800 placeholder:text-slate-400 focus:border-blue-500",
    supportNote: "text-slate-500",
    submitButton:
      "brand-btn brand-btn-primary brand-btn-md w-full rounded-xl text-xs font-black tracking-[0.08em] disabled:opacity-50",
    successBox: "bg-emerald-50/90 border border-emerald-200 text-emerald-800",
    successText: "text-emerald-700",
    avatarBorder: "border-white/80",
    fab: "brand-btn brand-btn-primary h-14 w-14 rounded-[1.7rem] shadow-[0_22px_54px_rgba(30,112,209,0.26)]",
    fabActive:
      "brand-btn brand-btn-secondary h-14 w-14 rounded-[1.7rem] shadow-[0_18px_40px_rgba(15,23,42,0.14)]",
  },
  dark: {
    panel:
      "light-glow-card-static border border-slate-800/80 text-slate-100 shadow-[0_28px_80px_rgba(3,10,28,0.52)]",
    header:
      "bg-[linear-gradient(135deg,rgba(3,18,48,0.98),rgba(15,69,150,0.96),rgba(53,128,224,0.88))]",
    headerSubtle: "text-white/74",
    statusText: "text-white/68",
    introBubble:
      "border border-[rgb(var(--brand-line)/0.48)] bg-[rgb(var(--brand-surface)/0.88)] text-slate-100 shadow-[0_22px_50px_rgba(2,6,23,0.34)]",
    botBubble:
      "border border-[rgb(var(--brand-line)/0.5)] bg-[rgb(var(--brand-surface-soft)/0.82)] text-slate-100 shadow-[0_22px_50px_rgba(2,6,23,0.34)]",
    userBubble:
      "bg-[linear-gradient(135deg,rgba(31,88,191,0.98),rgba(92,209,229,0.92))] text-slate-950 shadow-[0_20px_48px_rgba(53,128,224,0.28)]",
    loaderBubble:
      "border border-[rgb(var(--brand-line)/0.5)] bg-[rgb(var(--brand-surface-soft)/0.82)] shadow-[0_22px_50px_rgba(2,6,23,0.34)]",
    loaderDot: "bg-[rgb(var(--brand-cyan))]",
    messages: "bg-transparent",
    section: "border-slate-800/80 bg-slate-950/34 backdrop-blur-xl",
    sectionText: "text-slate-400",
    quickButton:
      "brand-btn brand-btn-secondary brand-btn-sm w-full justify-center rounded-full px-3 py-1.5 text-center text-[11px] font-black tracking-[0.04em] sm:w-auto",
    inputWrap: "border-slate-800/80 bg-slate-950/34 backdrop-blur-xl",
    input:
      "atty-widget-field atty-widget-field-dark border-[rgb(var(--brand-line)/0.56)] bg-[rgb(var(--brand-surface)/0.82)] text-slate-100 placeholder:text-slate-500 shadow-[0_22px_50px_rgba(2,6,23,0.32)] focus:border-blue-400",
    sendButton:
      "brand-btn brand-btn-primary flex h-11 w-full flex-shrink-0 items-center justify-center rounded-[1.1rem] p-0 disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-2xl",
    supportCard:
      "border border-slate-800/80 bg-slate-950/34 text-slate-100 shadow-[0_24px_58px_rgba(2,6,23,0.44)] backdrop-blur-xl",
    supportTitle: "text-slate-100",
    supportLabel: "text-slate-400",
    supportReadonly:
      "atty-widget-field atty-widget-field-dark border-[rgb(var(--brand-line)/0.48)] bg-[rgb(var(--brand-ink)/0.5)] text-slate-400",
    supportEditable:
      "atty-widget-field atty-widget-field-dark border-[rgb(var(--brand-line)/0.56)] bg-[rgb(var(--brand-surface)/0.76)] text-slate-100 placeholder:text-slate-500 focus:border-blue-400",
    supportNote: "text-slate-500",
    submitButton:
      "brand-btn brand-btn-primary brand-btn-md w-full rounded-xl text-xs font-black tracking-[0.08em] disabled:opacity-50",
    successBox: "bg-emerald-500/10 border border-emerald-500/25 text-emerald-100",
    successText: "text-emerald-200",
    avatarBorder: "border-blue-400/30",
    fab: "brand-btn brand-btn-primary h-14 w-14 rounded-[1.7rem] shadow-[0_24px_58px_rgba(3,10,28,0.54)]",
    fabActive:
      "brand-btn brand-btn-secondary h-14 w-14 rounded-[1.7rem] shadow-[0_24px_58px_rgba(3,10,28,0.46)]",
  },
};

function BotAvatar({ avatarBorder }) {
  return (
    <div
      className={`brand-logo-reveal flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border bg-white p-0.5 shadow-[0_10px_24px_rgba(3,10,28,0.14)] sm:h-9 sm:w-9 sm:rounded-[1rem] ${avatarBorder}`}
    >
      <div className="brand-logo-spotlight h-full w-full">
        <Image
          src="/logo1-clean.webp"
          alt="Atty"
          width={32}
          height={32}
          className="brand-logo-mark h-full w-full object-contain"
        />
      </div>
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
    <div className={`w-full rounded-[1.25rem] p-3 text-sm sm:flex-1 sm:rounded-[1.4rem] ${theme.supportCard}`}>
      <p className={`mb-2 font-black tracking-[0.04em] ${theme.supportTitle}`}>
        Contact support
      </p>

      <div className="flex flex-col gap-2">
        <div>
          <label className={`mb-1 block text-[11px] ${theme.supportLabel}`}>
            Name
          </label>
          <input
            type="text"
            value={form.name}
            readOnly
            className={`w-full cursor-not-allowed rounded-xl px-2.5 py-2 text-xs focus:outline-none ${theme.supportReadonly}`}
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
            className={`w-full cursor-not-allowed rounded-xl px-2.5 py-2 text-xs focus:outline-none ${theme.supportReadonly}`}
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
            className={`w-full cursor-not-allowed rounded-xl px-2.5 py-2 text-xs focus:outline-none ${theme.supportReadonly}`}
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
            className={`w-full rounded-xl px-2.5 py-2 text-xs focus:outline-none ${theme.supportEditable}`}
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
            className={`w-full resize-none rounded-xl px-2.5 py-2 text-xs focus:outline-none ${theme.supportEditable}`}
          />
        </div>

        {error ? <p className="text-xs text-rose-500">{error}</p> : null}

        <button onClick={handleSubmit} disabled={loading} className={theme.submitButton}>
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
  const { isDarkMode, mounted } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const bottomRef = useRef(null);

  const resolvedTheme = mounted && isDarkMode ? "dark" : "light";
  const theme = CHAT_THEME[resolvedTheme];
  const widgetModeClass = resolvedTheme === "dark"
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
      {open ? (
        <div
          className={`fixed bottom-20 left-3 right-3 z-50 flex min-w-0 max-h-[calc(100dvh-6rem)] w-auto max-w-none flex-col overflow-hidden rounded-[1.75rem] border shadow-xl overscroll-contain sm:bottom-24 sm:left-auto sm:right-4 sm:w-[24rem] sm:max-w-[calc(100vw-2rem)] sm:max-h-[min(82dvh,720px)] sm:rounded-[2rem] md:w-[26rem] lg:w-[28rem] 2xl:w-[30rem] ${widgetModeClass} ${theme.panel}`}
        >
          <div
            className={`relative flex flex-shrink-0 items-start gap-2.5 overflow-hidden px-3.5 py-3.5 sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${theme.header}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.14),transparent_28%)]" />

            <div className="brand-logo-reveal relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/25 bg-white p-0.5 shadow-[0_14px_30px_rgba(3,10,28,0.18)] sm:h-10 sm:w-10 sm:rounded-[1.2rem]">
              <div className="brand-logo-orbit absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.24),rgba(92,209,229,0.04)_72%)] blur-lg" />
              <div className="brand-logo-spotlight relative h-full w-full">
                <Image
                  src="/logo1-clean.webp"
                  alt="Atty"
                  width={40}
                  height={40}
                  className="brand-logo-mark h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="relative min-w-0 flex-1">
              <p className="text-sm font-black leading-tight text-white sm:text-[15px]">
                Atty
              </p>
              <p className={`pr-1 text-[10px] leading-relaxed sm:text-[11px] ${theme.headerSubtle}`}>
                Attendee assistant, tuned to your workspace
              </p>
              <div className="mt-1 hidden items-center gap-1 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className={`text-[11px] ${theme.statusText}`}>
                  Always on
                </span>
              </div>
            </div>

            <button
              onClick={closeChat}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/18 bg-white/10 text-white/75 transition hover:bg-white/16 hover:text-white sm:h-9 sm:w-9 sm:rounded-2xl"
              aria-label="Close Atty support"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 sm:gap-3 sm:p-4 ${theme.messages}`}
          >
            {messages.length === 0 ? (
              <div className="flex items-start gap-2">
                <BotAvatar avatarBorder={theme.avatarBorder} />
                <div
                  className={`max-w-[88%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed sm:max-w-[84%] ${theme.introBubble}`}
                >
                  Hi. Ask me anything about Attendee and I will get you an
                  answer fast.
                </div>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.role === "user"
                    ? "flex-row-reverse items-start"
                    : "items-start"
                }`}
              >
                {msg.role === "bot" ? (
                  <BotAvatar avatarBorder={theme.avatarBorder} />
                ) : null}

                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed sm:max-w-[84%] ${
                    msg.role === "user"
                      ? `rounded-tr-sm ${theme.userBubble}`
                      : `${theme.botBubble} rounded-tl-sm`
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading ? (
              <div className="flex items-start gap-2">
                <BotAvatar avatarBorder={theme.avatarBorder} />
                <div className={`rounded-2xl rounded-tl-sm px-3 py-2 ${theme.loaderBubble}`}>
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
            ) : null}

            {showForm ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <BotAvatar avatarBorder={theme.avatarBorder} />
                <SupportForm
                  onSubmit={handleFormSubmit}
                  loading={formLoading}
                  theme={theme}
                />
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          {messages.length === 0 ? (
            <div className={`flex-shrink-0 border-t px-3 pb-3 ${theme.section} sm:px-4`}>
              <p className={`mb-1.5 mt-2 text-[11px] ${theme.sectionText}`}>
                Quick questions
              </p>
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className={theme.quickButton}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={`flex flex-shrink-0 flex-col gap-2 border-t px-3 py-3 sm:flex-row sm:items-end sm:gap-2 sm:px-3 sm:py-2.5 ${theme.inputWrap}`}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Atty anything..."
              className={`min-h-[48px] max-h-24 flex-1 resize-none overflow-y-auto rounded-[1.1rem] border px-3 py-2 text-sm focus:outline-none sm:min-h-0 sm:max-h-20 sm:rounded-2xl ${theme.input}`}
            />
            <button
              onClick={() => handleAsk(input)}
              disabled={!input.trim() || chatLoading}
              className={theme.sendButton}
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => {
          if (open) closeChat();
          else setOpen(true);
        }}
        className={`fixed bottom-4 right-4 z-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5 ${open ? theme.fabActive : theme.fab}`}
        aria-label="Open Atty support"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageSquareText className="h-5 w-5" />
            <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white/70 dark:ring-slate-950/70" />
          </div>
        )}
      </button>
    </>
  );
}
