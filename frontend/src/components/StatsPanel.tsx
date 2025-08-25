import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LabelList } from "recharts";
import { AuthorityBar } from "./AuthorityBar";

export function StatsPanel({
  jurData,
  authData,
}: {
  jurData: { name: string; value: number }[];
  authData: { name: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Dataset by jurisdiction (Recharts)</h3>
        {/* Make sure parent doesn't clip labels */}
        <div className="h-56 overflow-visible">
        <ResponsiveContainer>
            <PieChart>
            <Pie
                data={jurData}
                dataKey="value"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
                labelLine={false}
            >
                <LabelList
                dataKey="value"
                position="inside"
                content={(props: any) => {
                    const { x, y, value, payload } = props;
                    const label = `${payload?.name ?? ""}: ${value}`;
                    return (
                    <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ fontSize: 11, fill: "#ffffff" }}
                    >
                        {label}
                    </text>
                    );
                }}
                />
                {jurData.map((_d, i) => (
                    <Cell key={i} />
                ))}
            </Pie>
            <Tooltip
                formatter={(v: number, _n, p: any) => [v, p?.payload?.name]}
                itemStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
        </ResponsiveContainer>
        </div>
        {/* Text fallback/list if labels still feel tight */}
        <ul className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-slate-600">
          {jurData.map((d) => (
            <li key={d.name} className="flex justify-between">
              <span>{d.name}</span>
              <span className="font-medium">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Top authorities (D3)</h3>
          <AuthorityBar data={authData.slice(0, 10)} />
      </div>
    </div>
  );
}
