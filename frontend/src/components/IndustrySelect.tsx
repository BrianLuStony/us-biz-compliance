import React from "react"
import { useBizStore } from "../store"

// Common presets; add more as you expand
const PRESETS: Array<{ label: string; naics: string }> = [
  { label: "Restaurant", naics: "722" },
  { label: "Bar / Tavern", naics: "7224" },
  { label: "Retail Store", naics: "44" },
  { label: "Healthcare Clinic", naics: "621" },
  { label: "Construction", naics: "23" },
  { label: "Tech / SaaS", naics: "5415" },
  { label: "Professional Services", naics: "5416" },
  { label: "E-commerce", naics: "454" },
]

export function IndustrySelect() {
  const { form, setForm } = useBizStore()

  // When preset changes:
  // - set industryPreset
  // - if user didn't manually type a NAICS or wants to sync, set naics = preset.naics
  function onPresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const label = e.target.value || undefined
    const preset = PRESETS.find(p => p.label === label)
    setForm({
      industryPreset: label,
      naics: preset ? preset.naics : form.naics, // choose to auto-fill; user can still edit the text below
    })
  }

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs text-slate-600">Industry (optional)</label>
      <select
        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
        value={form.industryPreset || ""}
        onChange={onPresetChange}
      >
        <option value="">Select an industry…</option>
        {PRESETS.map((p) => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
      </select>

      <label className="mb-1 mt-2 block text-xs text-slate-600">NAICS (optional)</label>
      <input
        type="text"
        placeholder="e.g. 722511 (full) or 722 (prefix)"
        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
        value={form.naics ?? ""}
        onChange={(e) => setForm({ naics: e.target.value || undefined })}
      />
      <p className="text-[11px] text-slate-500">
        Tip: Pick an industry to auto-fill a NAICS prefix, or type your exact code.
      </p>
    </div>
  )
}
