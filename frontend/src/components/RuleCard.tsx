import type { RuleDto } from "../types";
import { Badge } from "./Badge";

export function RuleCard({ rule }: { rule: RuleDto }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold leading-snug">{rule.title}</h3>
        <Badge>{rule.authority}</Badge>
      </div>

      {rule.description && (
        <p className="mt-1 text-sm text-slate-600">{rule.description}</p>
      )}

      {rule.requirements?.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
          {rule.requirements.map((req, i) => (
            <li key={i}>{req.action}</li>
          ))}
        </ul>
      )}

      {rule.references?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rule.references.map((ref, i) => (
            <a
              key={i}
              href={ref.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-700 underline underline-offset-2 hover:text-blue-800"
            >
              {ref.label}
            </a>
          ))}
        </div>
      )}

      {rule.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {rule.tags.map((t, i) => (
            <span
              key={i}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
