// src/components/AuthorityBar.tsx
import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

type Datum = { name: string; value: number };

export function AuthorityBar({ data }: { data: Datum[] }) {
  const ref = useRef<SVGSVGElement | null>(null);

  // show top 12; tweak as needed
  const rows = useMemo(() => data.slice(0, 12), [data]);

  useEffect(() => {
    const svgEl = ref.current;
    if (!svgEl) return;

    // ------- sizing -------
    const margin = { top: 10, right: 24, bottom: 40, left: 170 }; // bottom=40 to avoid cutoff
    const rowH = 26;                         // row height
    const innerH = Math.max(rowH * rows.length, 120);
    const width = 600;                       // can scroll horizontally if container smaller
    const height = innerH + margin.top + margin.bottom;

    // ------- setup -------
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .style("overflow", "visible");        // prevent clipping within svg

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ------- scales -------
    const max = d3.max(rows, (d) => d.value) ?? 1;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, max]).nice().range([0, w]);
    const y = d3
      .scaleBand<string>()
      .domain(rows.map((d) => d.name))
      .range([0, h])
      .padding(0.25);

    // ------- axes -------
    // x-axis at bottom with enough space (bottom margin 40)
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5))
      .call((sel) => sel.selectAll("text").attr("font-size", 11).attr("dy", "1.2em")); // push text a bit down

    g.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .call((sel) =>
        sel
          .selectAll("text")
          .attr("font-size", 11)
          .each(function () {
            const t = d3.select(this);
            const s = String(t.text());
            if (s.length > 36) t.text(s.slice(0, 33) + "…");
          })
      );

    // ------- bars -------
    g.selectAll("rect")
      .data(rows)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.name)!)
      .attr("width", (d) => x(d.value))
      .attr("height", y.bandwidth())
      .attr("fill", "#3b82f6"); // tailwind blue-500

    // ------- value labels (to the right of bars) -------
    g.selectAll("text.value")
      .data(rows)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => x(d.value) + 6)
      .attr("y", (d) => y(d.name)! + y.bandwidth() / 2)
      .attr("dy", "0.32em")
      .attr("font-size", 11)
      .attr("fill", "#334155") // slate-700
      .text((d) => d.value);
  }, [rows]);

  return (
    // overflow-visible stops any parent clipping; x-scroll if needed
    <div className="w-full overflow-x-auto overflow-y-visible">
      <svg ref={ref} className="block overflow-visible" />
    </div>
  );
}
