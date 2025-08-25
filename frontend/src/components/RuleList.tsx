import { useMemo } from "react";
import type { RuleDto } from "../types";
import { RuleCard } from "./RuleCard";
import { Badge } from "./Badge";

const JUR_ORDER: Record<string, number> = { federal: 0, state: 1, local: 2 };

export function RuleList({ rules }: { rules: RuleDto[] }) {
  const grouped = useMemo(() => {
    const byJur: Record<string, RuleDto[]> = {};
    for (const r of rules) (byJur[r.jurisdiction] ??= []).push(r);
    for (const k of Object.keys(byJur)) {
      byJur[k].sort((a, b) =>
        a.authority.localeCompare(b.authority, "en", { sensitivity: "base" })
      );
    }
    return Object.entries(byJur).sort(
      (a, b) => (JUR_ORDER[a[0]] ?? 9) - (JUR_ORDER[b[0]] ?? 9)
    );
  }, [rules]);

  if (!rules.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Fill the form and click <b>See my obligations</b>.
      </div>
    );

  return (
    <div className="space-y-8">
      {grouped.map(([jur, items]) => (
        <section key={jur} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge>{jur}</Badge>
            <span className="text-xs text-slate-500">{items.length} result(s)</span>
          </div>
          <div className="grid gap-3">
            {items.map((r) => (
              <RuleCard key={r.id} rule={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
