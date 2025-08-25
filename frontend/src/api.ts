import type { BizInput, EvaluateResponse, StatsResponse } from "./types"

export async function evaluate(input: BizInput): Promise<EvaluateResponse> {
  const res = await fetch("/evaluate", {    // or "/api/evaluate" if you proxy
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error("Evaluation failed")
  return res.json()
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch("/stats")
  if (!res.ok) throw new Error("Stats failed")
  return res.json()
}
