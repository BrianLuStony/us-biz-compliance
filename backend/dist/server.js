"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("./lib/prisma"); // your PrismaClient()
const zod_1 = require("./lib/zod"); // your schema
const evals_1 = require("./lib/evals");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
// Browse rules (with simple filters + pagination)
app.get("/rules", async (req, res) => {
    const { jurisdiction, authority, q, limit = "50", offset = "0" } = req.query;
    const where = {};
    if (jurisdiction)
        where.jurisdiction = jurisdiction;
    if (authority)
        where.authority = { contains: authority, mode: "insensitive" };
    if (q)
        where.title = { contains: q, mode: "insensitive" };
    const [count, rules] = await Promise.all([
        prisma_1.prisma.rule.count({ where }),
        prisma_1.prisma.rule.findMany({
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
    const byJurisdiction = await prisma_1.prisma.$queryRaw `SELECT jurisdiction, COUNT(*)::bigint as count FROM "Rule" GROUP BY jurisdiction`;
    const byAuthority = await prisma_1.prisma.$queryRaw `SELECT authority, COUNT(*)::bigint as count FROM "Rule" GROUP BY authority ORDER BY count DESC LIMIT 15`;
    res.json({
        byJurisdiction: byJurisdiction.map(r => ({ ...r, count: Number(r.count) })),
        byAuthority: byAuthority.map(r => ({ ...r, count: Number(r.count) })),
    });
});
// Core evaluation
app.post("/evaluate", async (req, res) => {
    const parsed = zod_1.BizInputZ.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const biz = parsed.data;
    // Pull a reasonable pool; you can add WHERE filters later for speed
    const pool = await prisma_1.prisma.rule.findMany({ take: 5000 });
    const matched = pool.filter(r => (0, evals_1.ruleApplies)({ jurisdiction: r.jurisdiction, scope: r.scope, conditions: r.conditions }, biz));
    res.json({
        input: biz,
        matched: matched.map(r => ({
            id: r.id,
            title: r.title,
            jurisdiction: r.jurisdiction,
            authority: r.authority,
            description: r.description,
            requirements: r.requirements,
            references: r.references,
            tags: r.tags
        })),
        stats: { poolCount: pool.length, matchedCount: matched.length }
    });
});
// ---- Single URL: serve the SPA build from /public ----
const PUBLIC_DIR = path_1.default.join(__dirname, "../public"); // copy your frontend build here
app.use(express_1.default.static(PUBLIC_DIR));
app.get(/^(?!\/(health|rules|stats|evaluate)(\/|$)).*/, (_req, res) => {
    res.sendFile(path_1.default.join(PUBLIC_DIR, "index.html"));
});
const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`Server on http://localhost:${port}`));
