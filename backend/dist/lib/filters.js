"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preselectRules = preselectRules;
const prisma_1 = require("./prisma");
async function preselectRules(_biz) {
    // In demo: fetch a wide set; for big data add JSONB filters or tags here.
    return prisma_1.prisma.rule.findMany({
        where: {
            OR: [
                { jurisdiction: "federal" },
                { jurisdiction: "state" },
                { jurisdiction: "local" }
            ]
        },
        take: 5000
    });
}
