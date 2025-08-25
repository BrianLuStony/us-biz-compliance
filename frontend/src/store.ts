import { create } from "zustand"
import type { BizInput, RuleDto } from "./types"

type Store = {
  form: BizInput & { industryPreset?: string }   // 👈 track preset name
  setForm: (partial: Partial<BizInput & { industryPreset?: string }>) => void

  rules: RuleDto[]
  setRules: (next: RuleDto[]) => void

  jurData: { name: string; value: number }[]
  setJurData: (d: { name: string; value: number }[]) => void

  authData: { name: string; value: number }[]
  setAuthData: (d: { name: string; value: number }[]) => void

  warnings: string[]                   // 👈 add warnings
  setWarnings: (w: string[]) => void

  loading: boolean
  setLoading: (b: boolean) => void

  error: string | null
  setError: (m: string | null) => void
}

export const useBizStore = create<Store>((set) => ({
  form: {
    state: "NY",
    city: "New York",
    zip: "10001",
    naics: "722511",
    industryPreset: "Restaurant",     // default preset
    employees: 12,
    revenueUSD: 1200000,
    publicFacing: true,
    hasEmployees: true,
    handlesPHI: false,
    servesAlcohol: true,
    handlesFood: true,
    collectsPII: true,
    ecommerce: true,
    outdoorWork: false,
    exposureBlood: false,
  },
  setForm: (partial) => set((s) => ({ form: { ...s.form, ...partial } })),

  rules: [],
  setRules: (next) => set({ rules: next }),

  jurData: [],
  setJurData: (d) => set({ jurData: d }),

  authData: [],
  setAuthData: (d) => set({ authData: d }),

  warnings: [],                        // 👈
  setWarnings: (w) => set({ warnings: w }),

  loading: false,
  setLoading: (b) => set({ loading: b }),

  error: null,
  setError: (m) => set({ error: m }),
}))
