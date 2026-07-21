"use client";

import { Mail, Phone, MapPin, Send, MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL } from "@/services/api/baseApi";
import {
  PERSON_NAME_REGEX,
  normalizeEmailInput,
  normalizeTextInput,
  validateEmailInput,
  validateRequiredText,
} from "@/utils/formValidation";

const EMPTY_FORM = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MAX_LENGTH = 500;

const getValidationState = (form) => {
  const normalizedForm = {
    name: normalizeTextInput(form.name),
    email: normalizeEmailInput(form.email),
    subject: normalizeTextInput(form.subject),
    message: String(form.message ?? "")
      .replace(/\r\n/g, "\n")
      .trim(),
  };

  const errors = {
    name: validateRequiredText({
      value: normalizedForm.name,
      label: "Full name",
      min: 2,
      max: 120,
      pattern: PERSON_NAME_REGEX,
      patternMessage: "Full name can only include letters, spaces, apostrophes, dots, or hyphens",
    }),
    email: validateEmailInput(normalizedForm.email, "Email address"),
    subject: validateRequiredText({
      value: normalizedForm.subject,
      label: "Subject",
      min: 3,
      max: SUBJECT_MAX_LENGTH,
    }),
    message: validateRequiredText({
      value: normalizedForm.message,
      label: "Message",
      min: 10,
      max: MESSAGE_MAX_LENGTH,
    }),
  };

  return {
    normalizedForm,
    errors,
  };
};

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      return {
        ...prev,
        [name]: "",
      };
    });
    setError("");
    setSuccess("");
    setWarning("");
  };

  const onFieldBlur = (event) => {
    const { name, value } = event.target;
    const nextForm = {
      ...form,
      [name]: value,
    };
    const validationState = getValidationState(nextForm);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: validationState.errors[name] || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWarning("");

    const { normalizedForm, errors } = getValidationState(form);
    setFieldErrors(errors);

    const validationError = Object.values(errors).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(normalizedForm),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to send message right now.");
      }

      setSuccess(data?.message || "Message sent successfully!");
      setWarning(data?.warning || "");
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch (submitError) {
      setError(submitError?.message || "Failed to send message right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-24 pt-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <h1 className="mb-8 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
              Get in <span className="gradient-text">Touch</span>
            </h1>
            <p className="mb-12 max-w-md text-lg font-medium leading-relaxed text-slate-500">
              Have questions about features, pricing, or enterprise solutions? Our team is here to
              help you scale your organization.
            </p>

            <div className="space-y-8">
              <ContactInfo
                icon={<Mail className="text-blue-600" size={24} />}
                iconWrapperClassName="border-blue-100 bg-blue-50 shadow-[0_16px_38px_rgba(59,130,246,0.12)] group-hover:bg-blue-600 group-hover:shadow-[0_20px_46px_rgba(59,130,246,0.16)] dark:group-hover:bg-blue-500"
                title="Email Us"
                content="info@veaglespace.com"
                sub="Available 24/7"
              />
              <ContactInfo
                icon={<Phone className="text-indigo-600" size={24} />}
                iconWrapperClassName="border-indigo-100 bg-indigo-50 shadow-[0_16px_38px_rgba(99,102,241,0.12)] group-hover:bg-indigo-600 group-hover:shadow-[0_20px_46px_rgba(99,102,241,0.16)] dark:group-hover:bg-indigo-500"
                title="Call Support"
                content="+91 8237999101"
                sub="Mon-Sat, 10am - 7pm"
              />
              <ContactInfo
                icon={<MapPin className="text-indigo-600" size={24} />}
                iconWrapperClassName="border-indigo-100 bg-indigo-50 shadow-[0_16px_38px_rgba(99,102,241,0.12)] group-hover:bg-indigo-600 group-hover:shadow-[0_20px_46px_rgba(99,102,241,0.16)] dark:group-hover:bg-indigo-500"
                title="Visit Office"
                content="'Kudale Patil Tower', Office No. 207, 2nd Floor, Jadhav Nagar, Near Shiv Temple, Vadgaon Budruk, Pune, Maharashtra 411041"
                sub="India"
                multiline
              />
            </div>
          </div>

          <div className="rounded-[3rem] border border-slate-100 bg-white p-8 shadow-[0_36px_104px_rgba(59,130,246,0.14),0_18px_42px_rgba(15,23,42,0.08)] md:p-12">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Send a Message</h3>
            </div>

            {error ? (
              <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </p>
            ) : null}

            {warning ? (
              <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                {warning}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <InputGroup
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={onInputChange}
                  onBlur={onFieldBlur}
                  placeholder="John Doe"
                  error={fieldErrors.name}
                  disabled={loading}
                  maxLength={120}
                />
                <InputGroup
                  label="Email Address"
                  name="email"
                  value={form.email}
                  onChange={onInputChange}
                  onBlur={onFieldBlur}
                  type="email"
                  placeholder="john@example.com"
                  error={fieldErrors.email}
                  disabled={loading}
                  maxLength={191}
                />
              </div>

              <InputGroup
                label="Subject"
                name="subject"
                value={form.subject}
                onChange={onInputChange}
                onBlur={onFieldBlur}
                placeholder="Inquiry about Pro Plan"
                error={fieldErrors.subject}
                disabled={loading}
                maxLength={SUBJECT_MAX_LENGTH}
              />

              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Message
                </label>
                <textarea
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={onInputChange}
                  onBlur={onFieldBlur}
                  placeholder="How can we help you?"
                  disabled={loading}
                  maxLength={MESSAGE_MAX_LENGTH}
                  aria-invalid={Boolean(fieldErrors.message)}
                  className={`w-full resize-none rounded-2xl border-2 bg-slate-50 p-4 font-medium outline-none transition-all focus:bg-white focus:ring-4 ${
                    fieldErrors.message
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-100 focus:border-blue-600 focus:ring-blue-100"
                  }`}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    {fieldErrors.message || "Minimum 10 characters required."}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {form.message.length}/{MESSAGE_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 font-black text-white shadow-[0_24px_60px_rgba(59,130,246,0.24)] transition-all hover:bg-blue-700 hover:shadow-[0_28px_70px_rgba(59,130,246,0.28)] disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Send Message
                    <Send
                      size={18}
                      className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactInfo({
  icon,
  title,
  content,
  sub,
  iconWrapperClassName = "",
  multiline = false,
}) {
  return (
    <div className="group flex items-start gap-6">
      <div
        className={`brand-hover-white-media mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all ${iconWrapperClassName}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h4>
        <p
          className={`text-lg font-black text-slate-900 ${
            multiline ? "max-w-xl leading-relaxed" : ""
          }`}
        >
          {content}
        </p>
        <p className="text-xs font-medium text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function InputGroup({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  error = "",
  disabled = false,
  maxLength,
}) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-2xl border-2 bg-slate-50 p-4 font-medium outline-none transition-all focus:bg-white focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-slate-100 focus:border-blue-600 focus:ring-blue-100"
        }`}
      />
      <p className="ml-1 text-xs font-medium text-slate-400">{error || "\u00a0"}</p>
    </div>
  );
}
