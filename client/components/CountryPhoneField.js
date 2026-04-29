"use client";

import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_PHONE_OPTIONS, getDefaultCountryCode } from "@/utils/phone";

export default function CountryPhoneField({
  label = "Mobile Number",
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  countryCodeName = "countryCode",
  phoneName = "phone",
  phonePlaceholder = " ",
  countryCodeError = "",
  phoneError = "",
  helpText = "",
  disabled = false,
  required = false,
  icon: Icon = Phone,
  containerClassName = "",
  labelClassName = "",
  groupClassName = "",
  selectClassName = "",
  inputClassName = "",
  messageClassName = "",
  iconClassName = "",
  selectAutoComplete = "off",
  phoneAutoComplete = "tel-national",
  selectProps = {},
  phoneProps = {},
}) {
  const hasError = Boolean(countryCodeError || phoneError);

  return (
    <div className={containerClassName}>
      <label className={labelClassName}>
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>

      <div
        className={cn(
          "relative flex min-w-0 overflow-hidden rounded-[1.4rem] border-2 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100/80 dark:bg-slate-950/88 dark:focus:border-blue-400 dark:focus:ring-blue-500/10",
          hasError
            ? "border-red-400 bg-red-50/70 focus-within:border-red-500 focus-within:ring-red-500/10 dark:border-red-400/60 dark:bg-rose-500/10"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/88 dark:hover:border-slate-600",
          groupClassName
        )}
      >
        {Icon ? (
          <div className="pointer-events-none flex shrink-0 items-center justify-center border-r border-slate-200 px-3 text-slate-400 dark:border-slate-700 dark:text-slate-500">
            <Icon size={18} className={iconClassName} />
          </div>
        ) : null}

        <select
          name={countryCodeName}
          value={getDefaultCountryCode(countryCode)}
          onChange={onCountryCodeChange}
          disabled={disabled}
          autoComplete={selectAutoComplete}
          className={cn(
            "w-[5.5rem] shrink-0 border-r border-slate-200 bg-white px-2.5 py-3 text-xs font-semibold text-slate-900 outline-none sm:w-[6.75rem] sm:px-3 sm:py-4 sm:text-sm dark:border-slate-700 dark:bg-slate-950/88 dark:text-slate-100",
            selectClassName
          )}
          {...selectProps}
        >
          {COUNTRY_PHONE_OPTIONS.map((option) => (
            <option key={`${option.iso}-${option.code}`} value={option.code}>
              {option.iso} {option.code}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete={phoneAutoComplete}
          name={phoneName}
          value={phone}
          onChange={onPhoneChange}
          disabled={disabled}
          placeholder={phonePlaceholder}
          className={cn(
            "min-w-0 flex-1 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:px-4 sm:py-4 dark:bg-slate-950/88 dark:text-slate-100 dark:placeholder:text-slate-500",
            inputClassName
          )}
          {...phoneProps}
        />
      </div>

      {hasError ? (
        <p className={cn("ml-1 mt-1.5 text-xs font-medium text-red-500", messageClassName)}>
          {countryCodeError || phoneError}
        </p>
      ) : helpText ? (
        <p className={cn("ml-1 mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-400", messageClassName)}>
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
