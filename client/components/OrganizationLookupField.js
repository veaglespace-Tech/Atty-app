"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { Building2, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLazySearchOrganizationsQuery } from "@/services/api/authApi";

const formatOrganizationMeta = (organization) =>
  [organization?.city, organization?.state, organization?.country].filter(Boolean).join(", ");

export default function OrganizationLookupField({
  label = "Organization",
  placeholder = "Search by organization name",
  helperText = "",
  error = "",
  selectedOrganization = null,
  onSelect,
  onClear,
  onInputValueChange,
  labelClassName = "",
  inputClassName = "",
  normalFieldClassName = "",
  errorFieldClassName = "",
  helperClassName = "",
  containerClassName = "",
}) {
  const [query, setQuery] = useState(selectedOrganization?.name || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const deferredQuery = useDeferredValue(query);
  const wrapperRef = useRef(null);
  const requestIdRef = useRef(0);
  const [searchOrganizations, { isFetching }] = useLazySearchOrganizationsQuery();

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const trimmed = deferredQuery.trim();

    if (!open || trimmed.length < 2) {
      startTransition(() => setResults([]));
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timeoutId = setTimeout(async () => {
      try {
        const response = await searchOrganizations({ query: trimmed, limit: 8 }).unwrap();
        if (requestId !== requestIdRef.current) return;
        startTransition(() => {
          setResults(Array.isArray(response?.items) ? response.items : []);
        });
      } catch (searchError) {
        if (requestId !== requestIdRef.current) return;
        startTransition(() => {
          setResults([]);
        });
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [deferredQuery, open, searchOrganizations]);

  const hasError = Boolean(error);
  const showEmptyState =
    open && deferredQuery.trim().length >= 2 && !isFetching && results.length === 0;

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    setOpen(true);
    onInputValueChange?.(nextValue);

    if (nextValue.trim().length < 2) {
      setResults([]);
    }

    if (selectedOrganization) {
      onClear?.();
    }
  };

  const handleSelect = (organization) => {
    onSelect?.(organization);
    onInputValueChange?.(organization?.name || "");
    setQuery(organization?.name || "");
    startTransition(() => {
      setResults([]);
    });
    setOpen(false);
  };

  const inputValue =
    selectedOrganization && !open ? selectedOrganization.name || query : query;

  return (
    <div ref={wrapperRef} className={cn("group relative", containerClassName)}>
      <label className={labelClassName}>{label}</label>

      <div className="relative">
        <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
          <Building2 size={20} />
        </span>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            inputClassName,
            "!pl-12 pr-12",
            hasError ? errorFieldClassName : normalFieldClassName
          )}
        />

        {selectedOrganization ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              onInputValueChange?.("");
              onClear?.();
            }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear organization selection"
          >
            <X size={16} />
          </button>
        ) : isFetching ? (
          <span className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
          </span>
        ) : null}
      </div>

      {selectedOrganization ? (
        <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/90 px-4 py-3 text-left dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            Selected Workspace
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {selectedOrganization.name}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">
            {selectedOrganization.organizationCode}
            {formatOrganizationMeta(selectedOrganization)
              ? ` - ${formatOrganizationMeta(selectedOrganization)}`
              : ""}
          </p>
        </div>
      ) : null}

      {open && results.length > 0 ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-[1.5rem] border border-slate-200 bg-white/98 p-2 shadow-[0_20px_54px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/96">
          {results.map((organization) => {
            const meta = formatOrganizationMeta(organization);
            return (
              <button
                key={organization.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(organization)}
                className="flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                    {organization.organizationCode}
                  </p>
                  {meta ? (
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">
                      {meta}
                    </p>
                  ) : null}
                </div>
                <Check size={16} className="mt-1 shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="absolute z-30 mt-2 w-full rounded-[1.5rem] border border-slate-200 bg-white/98 px-4 py-4 text-sm font-medium text-slate-500 shadow-[0_20px_54px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/96 dark:text-slate-300">
          No matching organizations found.
        </div>
      ) : null}

      {hasError ? (
        <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">{error}</p>
      ) : helperText ? (
        <p
          className={cn(
            "ml-1 mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500",
            helperClassName
          )}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
