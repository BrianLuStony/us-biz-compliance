import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function upsertRaw(url: string, source: string, payload: any = {}) {
  const rd = await db.rawDoc.upsert({
    where: { url },
    update: { payload },
    create: { url, source, payload }
  });
  return rd.id;
}

async function main() {
  const oshaPosterUrl = "https://www.osha.gov/publications/poster";
  const oshaPosterRawId = await upsertRaw(oshaPosterUrl, "osha.gov");

  await db.rule.createMany({
    data: [
      {
        title: "Post OSHA Job Safety & Health Protection Poster",
        description: "Display the OSHA poster in a conspicuous location.",
        jurisdiction: "federal",
        authority: "OSHA (DOL)",
        scope: { geography: { country: "US" }, minEmployees: 1 },
        conditions: { mode: "all", predicates: [{ custom: "hasEmployees" }] },
        requirements: [{ action: "Display OSHA 3165 poster" }],
        penalties: "Citations possible if not posted.",
        references: [{ label: "OSHA Poster", url: oshaPosterUrl }],
        tags: ["labor","poster","workplace"],
        sourceDocId: oshaPosterRawId
      },
      {
        title: "FLSA Minimum Wage & Overtime",
        description: "Most employers must pay at/above minimum wage and 1.5x overtime (>40h) to non-exempt.",
        jurisdiction: "federal",
        authority: "Wage and Hour Division (DOL)",
        scope: { geography: { country: "US" }, minEmployees: 1 },
        conditions: { mode: "all", predicates: [{ custom: "hasEmployees" }] },
        requirements: [
          { action: "Pay at/above applicable minimum wage" },
          { action: "Pay overtime (1.5x) to non-exempt over 40h/week" }
        ],
        references: [{ label: "FLSA", url: "https://www.dol.gov/agencies/whd/flsa" }],
        tags: ["wage","overtime"]
      },
      {
        title: "California: IIPP (Injury & Illness Prevention Program)",
        description: "Most CA employers must implement a written IIPP.",
        jurisdiction: "state",
        authority: "Cal/OSHA",
        scope: { geography: { states: ["CA"] }, minEmployees: 1 },
        conditions: { mode: "all", predicates: [{ custom: "hasEmployees" }] },
        requirements: [
          { action: "Create written IIPP" },
          { action: "Train employees; identify & correct hazards" }
        ],
        references: [{ label: "Cal/OSHA IIPP", url: "https://www.dir.ca.gov/dosh/etools/09-031/" }],
        tags: ["california","safety"]
      },
      {
        title: "New York: Sexual Harassment Policy & Annual Training",
        description: "NY requires a harassment policy and annual interactive training.",
        jurisdiction: "state",
        authority: "NYS DHR",
        scope: { geography: { states: ["NY"] }, minEmployees: 1 },
        conditions: { mode: "all", predicates: [{ custom: "hasEmployees" }] },
        requirements: [
          { action: "Adopt model policy or equivalent" },
          { action: "Provide annual interactive training" }
        ],
        references: [{ label: "NYS Requirements", url: "https://www.ny.gov/combating-sexual-harassment-workplace/employers" }],
        tags: ["new-york","training"]
      },
      {
        title: "San Francisco: Retail Food Facility Permit",
        description: "Food preparation/service requires SFDPH permit.",
        jurisdiction: "local",
        authority: "SFDPH",
        scope: {
          geography: { states: ["CA"], cities: ["San Francisco"] },
          industries: [{ naicsPrefix: "722", label: "Food Services" }]
        },
        conditions: { mode: "all", predicates: [{ custom: "handlesFood" }] },
        requirements: [
          { action: "Obtain Retail Food Facility Permit before operating" },
          { action: "Maintain food safety manager certification" }
        ],
        references: [{ label: "SFDPH Food", url: "https://www.sfdph.org/dph/eh/food/" }],
        tags: ["san-francisco","food"]
      },
      {
        title: "HIPAA (Covered Entity/Business Associate)",
        description: "If you handle PHI and are a covered entity/BA.",
        jurisdiction: "federal",
        authority: "HHS",
        scope: { geography: { country: "US" }, industries: [{ naicsPrefix: "62", label: "Healthcare" }] },
        conditions: { mode: "all", predicates: [{ custom: "handlesPHI" }] },
        requirements: [
          { action: "Appoint privacy & security officer" },
          { action: "Implement HIPAA Privacy/Security/Breach policies" },
          { action: "Execute BAAs with vendors" }
        ],
        references: [{ label: "HHS HIPAA", url: "https://www.hhs.gov/hipaa/for-professionals/index.html" }],
        tags: ["privacy","health"]
      },
      {
        title: "CCPA/CPRA Applicability (California)",
        description: "Applies when revenue/volume thresholds met and PII collected.",
        jurisdiction: "state",
        authority: "CPPA",
        scope: { geography: { states: ["CA"] } },
        conditions: {
          mode: "all",
          predicates: [
            { field: "collectsPII", op: "eq", value: true },
            { field: "revenueUSD", op: "gte", value: 25000000 }
          ]
        },
        requirements: [
          { action: "Provide privacy notices & rights handling" },
          { action: "Offer Do Not Sell/Share if applicable" }
        ],
        references: [{ label: "CPPA", url: "https://cppa.ca.gov/" }],
        tags: ["privacy","california"]
      }
    ]
  });
}

main().finally(() => db.$disconnect());
