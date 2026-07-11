"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  PERSON_NAME_REGEX,
  normalizeEmailInput,
  normalizeTextInput,
  validateEmailInput,
  validateRequiredText,
} from "@/utils/formValidation";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedForm = {
      name: normalizeTextInput(form.name),
      email: normalizeEmailInput(form.email),
      subject: normalizeTextInput(form.subject),
      message: normalizeTextInput(form.message),
    };

    const validationError =
      validateRequiredText({
        value: normalizedForm.name,
        label: "Full name",
        min: 2,
        max: 120,
        pattern: PERSON_NAME_REGEX,
        patternMessage: "Full name can only include letters, spaces, apostrophes, dots, or hyphens",
      }) ||
      validateEmailInput(normalizedForm.email, "Email address") ||
      validateRequiredText({
        value: normalizedForm.subject,
        label: "Subject",
        min: 3,
        max: 120,
      }) ||
      validateRequiredText({
        value: normalizedForm.message,
        label: "Message",
        min: 10,
        max: 500,
      });

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setSuccess("Message sent successfully!");
      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-24 pt-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
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
                title="Email Us"
                content="info@veaglespace.com"
                sub="Available 24/7"
              />
              <ContactInfo
                icon={<Phone className="text-indigo-600" size={24} />}
                title="Call Support"
                content="+91 8237999101"
                sub="Mon-Sat, 10am - 7pm"
              />
              <ContactInfo
                icon={<MapPin className="text-emerald-600" size={24} />}
                title="Visit Office"
                content="'Kudale Patil Tower', Office No. 207, 2nd Floor, Jadhav Nagar, Near Shiv Temple, Vadgaon Budruk, Pune, Maharashtra 411041"
                sub="India"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[3rem] border border-slate-100 bg-white p-8 shadow-[0_36px_104px_rgba(59,130,246,0.14),0_18px_42px_rgba(15,23,42,0.08)] md:p-12"
          >
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <InputGroup
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={onInputChange}
                  placeholder="John Doe"
                />
                <InputGroup
                  label="Email Address"
                  name="email"
                  value={form.email}
                  onChange={onInputChange}
                  type="email"
                  placeholder="john@example.com"
                />
              </div>

              <InputGroup
                label="Subject"
                name="subject"
                value={form.subject}
                onChange={onInputChange}
                placeholder="Inquiry about Pro Plan"
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
                  placeholder="How can we help you?"
                  className="w-full resize-none rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-medium outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ContactInfo({ icon, title, content, sub }) {
  return (
    <div className="group flex items-center gap-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)] transition-all group-hover:shadow-[0_20px_46px_rgba(59,130,246,0.12)]">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h4>
        <p className="text-lg font-black text-slate-900">{content}</p>
        <p className="text-xs font-medium text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function InputGroup({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-medium outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}
