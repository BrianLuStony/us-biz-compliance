// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { prisma } from "./lib/prisma";  // your PrismaClient()
import { BizInputZ } from "./lib/zod";  // your schema
import { ruleApplies } from "./lib/evals";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Browse rules (with simple filters + pagination)
app.get("/rules", async (req, res) => {
  const { jurisdiction, authority, q, limit = "50", offset = "0" } = req.query as any;
  const where: any = {};
  if (jurisdiction) where.jurisdiction = jurisdiction;
  if (authority) where.authority = { contains: authority as string, mode: "insensitive" };
  if (q) where.title = { contains: q as string, mode: "insensitive" };

  const [count, rules] = await Promise.all([
    prisma.rule.count({ where }),
    prisma.rule.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit, 10), 200),
      skip: parseInt(offset, 10)
    })
  ]);
  res.json({ count, rules });
});

// Stats for your chart
app.get("/stats", async (_req, res) => {
  const byJurisdiction = await prisma.$queryRaw<
    Array<{ jurisdiction: string; count: bigint }>
  >`SELECT jurisdiction, COUNT(*)::bigint as count FROM "Rule" GROUP BY jurisdiction`;

  const byAuthority = await prisma.$queryRaw<
    Array<{ authority: string; count: bigint }>
  >`SELECT authority, COUNT(*)::bigint as count FROM "Rule" GROUP BY authority ORDER BY count DESC LIMIT 15`;

  res.json({
    byJurisdiction: byJurisdiction.map(r => ({ ...r, count: Number(r.count) })),
    byAuthority: byAuthority.map(r => ({ ...r, count: Number(r.count) })),
  });
});

// Core evaluation (with warnings)
app.post("/evaluate", async (req, res) => {
  const parsed = BizInputZ.safeParse(req.body);
  if (!parsed.success) {
    console.log("FAILED PARSE");
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const biz = parsed.data;

  // Collect non-blocking warnings for incomplete inputs
  const warnings: string[] = [];
  if (!biz.naics) {
    warnings.push("Industry-specific rules may be missing because NAICS was not provided.");
  }
  if (!biz.city) {
    warnings.push("City-specific rules may be missing because City was not provided.");
  }
  if (!biz.zip) {
    warnings.push("ZIP-based rules may be less precise because ZIP was not provided.");
  }

  // Pull a reasonable pool; later you can add WHERE filters for perf (e.g., by jurisdiction/state)
  const pool = await prisma.rule.findMany({ take: 5000 });

  const matched = pool.filter((r) =>
    ruleApplies(
      {
        jurisdiction: r.jurisdiction as any,
        scope: r.scope as any,
        conditions: r.conditions as any,
      },
      biz
    )
  );

  res.json({
    input: biz,
    matched: matched.map((r) => ({
      id: r.id,
      title: r.title,
      jurisdiction: r.jurisdiction,
      authority: r.authority,
      description: r.description,
      requirements: r.requirements,
      references: r.references,
      tags: r.tags,
    })),
    stats: { poolCount: pool.length, matchedCount: matched.length },
    warnings, // 👈 new field
  });
});
// ---- Single URL: serve the SPA build from /public ----
const PUBLIC_DIR = path.join(__dirname, "../public"); // copy your frontend build here
app.use(express.static(PUBLIC_DIR));
app.get(/^(?!\/(health|rules|stats|evaluate)(\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});
const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`Server on http://localhost:${port}`));
