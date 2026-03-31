"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function PasswordInput({
  icon: Icon = Lock,
  className = "",
  toggleClassName = "",
  iconClassName = "",
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {Icon ? (
        <span
          className={`absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600 ${iconClassName}`}
        >
          <Icon size={20} />
        </span>
      ) : null}

      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className={`absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors hover:text-blue-600 focus:outline-none dark:text-slate-500 dark:hover:text-blue-300 ${toggleClassName}`}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
