import { prisma } from "./prisma";
import type { BizInput } from "./zod";

export async function preselectRules(_biz: BizInput) {
  // In demo: fetch a wide set; for big data add JSONB filters or tags here.
  return prisma.rule.findMany({
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
