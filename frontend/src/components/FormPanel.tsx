import React from "react";
import { useBizStore } from "../store";
import type { BizInput } from "../types";

const CHECKS: Array<[keyof BizInput, string]> = [
  ["publicFacing", "Public-facing"],
  ["hasEmployees", "Has employees"],
  ["handlesFood", "Handles food"],
  ["servesAlcohol", "Serves alcohol"],
  ["collectsPII", "Collects PII"],
  ["ecommerce", "E-commerce"],
  ["handlesPHI", "Handles PHI"],
  ["outdoorWork", "Outdoor work"],
  ["exposureBlood", "Blood/OPIM exposure"],
];

export function FormPanel({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) {
  const { form, setForm, loading, error } = useBizStore();

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-medium">Your business</h2>

      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="State" value={form.state || ""} onChange={(v) => setForm({ state: v })} />
        <LabeledInput label="City" value={form.city || ""} onChange={(v) => setForm({ city: v })} />
        <LabeledInput label="ZIP" value={form.zip || ""} onChange={(v) => setForm({ zip: v })} />
        <LabeledInput label="NAICS" value={form.naics || ""} onChange={(v) => setForm({ naics: v })} />
        <LabeledInput label="Employees" type="number" value={String(form.employees ?? "")}
          onChange={(v) => setForm({ employees: v ? Number(v) : undefined })} />
        <LabeledInput label="Revenue (USD)" type="number" value={String(form.revenueUSD ?? "")}
          onChange={(v) => setForm({ revenueUSD: v ? Number(v) : undefined })} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CHECKS.map(([key, label]) => (
          <label key={String(key)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 accent-black"
              checked={Boolean((form as any)[key])}
              onChange={(e) => setForm({ [key]: e.target.checked } as any)}
            />
            {label}
          </label>
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button disabled={loading} className="mt-3 w-full rounded-xl bg-black py-2 text-white disabled:opacity-60">
        {loading ? "Evaluating…" : "See my obligations"}
      </button>
    </form>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-600">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 placeholder-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
