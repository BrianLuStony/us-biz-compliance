// scripts/transform.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

type Maker = (rd: { id: string; url: string; source: string }) => Promise<ReturnType<typeof makeRule> | null>
function makeRule(args: {
  title: string
  description?: string
  jurisdiction: 'federal'|'state'|'local'
  authority: string
  scope: any
  conditions: any
  requirements: { action: string; details?: string }[]
  penalties?: string
  references: { label: string; url: string }[]
  tags: string[]
  extractor: string
}) { return args }

// ----------------- EXTRACTORS (URL → normalized Rule) -----------------

const oshaPoster: Maker = async (rd) => {
  if (!rd.url.includes('osha.gov/publications/poster')) return null
  return makeRule({
    title: 'Post OSHA Job Safety & Health Protection Poster',
    description: 'Display the OSHA poster in a conspicuous workplace location.',
    jurisdiction: 'federal',
    authority: 'OSHA (DOL)',
    scope: { geography: { country: 'US' }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Display OSHA 3165 poster' }],
    penalties: 'Citations possible if not posted.',
    references: [{ label: 'OSHA Poster', url: rd.url }],
    tags: ['labor','poster','workplace'],
    extractor: 'osha_poster'
  })
}

const oshaRecordkeeping: Maker = async (rd) => {
  if (!rd.url.includes('osha.gov/recordkeeping')) return null
  return makeRule({
    title: 'OSHA Recordkeeping (Injury & Illness Logs)',
    description: 'Employers with >10 employees generally must keep OSHA injury/illness records.',
    jurisdiction: 'federal',
    authority: 'OSHA (DOL)',
    scope: { geography: { country: 'US' }, minEmployees: 11 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Maintain OSHA 300/300A/301 logs as applicable' }],
    references: [{ label: 'OSHA Recordkeeping', url: rd.url }],
    tags: ['safety','recordkeeping'],
    extractor: 'osha_recordkeeping'
  })
}

const dolFlsa: Maker = async (rd) => {
  if (!rd.url.includes('dol.gov/agencies/whd/flsa')) return null
  return makeRule({
    title: 'FLSA Minimum Wage & Overtime',
    description: 'Non-exempt employees must receive at least minimum wage and 1.5x overtime >40h/week.',
    jurisdiction: 'federal',
    authority: 'Wage and Hour Division (DOL)',
    scope: { geography: { country: 'US' }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Pay at/above applicable minimum wage' },
      { action: 'Pay 1.5x overtime to non-exempt over 40h/week' }
    ],
    references: [{ label: 'FLSA Overview', url: rd.url }],
    tags: ['wage','overtime'],
    extractor: 'dol_flsa'
  })
}

const hhsHipaa: Maker = async (rd) => {
  if (!rd.url.includes('hhs.gov/hipaa/for-professionals')) return null
  return makeRule({
    title: 'HIPAA – Covered Entity/Business Associate',
    description: 'If you handle PHI and are a covered entity/BA, HIPAA privacy/security rules apply.',
    jurisdiction: 'federal',
    authority: 'HHS',
    scope: { geography: { country: 'US' }, industries: [{ naicsPrefix: '62', label: 'Healthcare' }] },
    conditions: { mode: 'all', predicates: [{ custom: 'handlesPHI' }] },
    requirements: [
      { action: 'Appoint privacy & security officer' },
      { action: 'Implement HIPAA Privacy/Security/Breach policies' },
      { action: 'Execute BAAs with vendors' }
    ],
    references: [{ label: 'HHS HIPAA', url: rd.url }],
    tags: ['privacy','health'],
    extractor: 'hhs_hipaa'
  })
}

const cppaCcpa: Maker = async (rd) => {
  if (!rd.url.includes('cppa.ca.gov')) return null
  return makeRule({
    title: 'California CCPA/CPRA Applicability',
    description: 'Applies to certain businesses in CA meeting revenue/volume thresholds.',
    jurisdiction: 'state',
    authority: 'California Privacy Protection Agency',
    scope: { geography: { states: ['CA'] } },
    conditions: {
      mode: 'all',
      predicates: [
        { field: 'collectsPII', op: 'eq', value: true },
        { field: 'revenueUSD', op: 'gte', value: 25000000 }
      ]
    },
    requirements: [
      { action: 'Provide privacy notices & consumer rights handling' },
      { action: 'Offer Do Not Sell/Share if applicable' }
    ],
    references: [{ label: 'CPPA Portal', url: rd.url }],
    tags: ['privacy','california'],
    extractor: 'cppa_ccpa'
  })
}

const nyHarassment: Maker = async (rd) => {
  if (!rd.url.includes('ny.gov/combating-sexual-harassment-workplace/employers')) return null
  return makeRule({
    title: 'New York: Sexual Harassment Policy & Annual Training',
    description: 'NY requires a written policy and annual interactive training for employees.',
    jurisdiction: 'state',
    authority: 'NYS (Division of Human Rights)',
    scope: { geography: { states: ['NY'] }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Adopt model policy or equivalent' },
      { action: 'Provide annual interactive training' }
    ],
    references: [{ label: 'NY Employer Requirements', url: rd.url }],
    tags: ['new-york','training'],
    extractor: 'ny_harassment'
  })
}

const sfFood: Maker = async (rd) => {
  if (!rd.url.includes('sfdph.org/dph/eh/food')) return null
  return makeRule({
    title: 'San Francisco: Retail Food Facility Permit',
    description: 'Food preparation/service generally requires a Health Permit from SFDPH.',
    jurisdiction: 'local',
    authority: 'San Francisco Department of Public Health',
    scope: {
      geography: { states: ['CA'], cities: ['San Francisco'] },
      industries: [{ naicsPrefix: '722', label: 'Food Services and Drinking Places' }]
    },
    conditions: { mode: 'all', predicates: [{ custom: 'handlesFood' }] },
    requirements: [
      { action: 'Obtain Retail Food Facility Permit before operating' },
      { action: 'Maintain food safety manager certification' }
    ],
    references: [{ label: 'SFDPH Food', url: rd.url }],
    tags: ['san-francisco','food'],
    extractor: 'sf_food'
  })
}

// Extra handy federal/local ones:
const irsEIN: Maker = async (rd) => {
  if (!rd.url.includes('irs.gov') || !rd.url.includes('ein')) return null
  return makeRule({
    title: 'Obtain an EIN (Employer Identification Number)',
    description: 'Most employers and many businesses need an EIN for tax administration.',
    jurisdiction: 'federal',
    authority: 'IRS',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'any', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Apply for EIN online (free)' }],
    references: [{ label: 'IRS EIN', url: rd.url }],
    tags: ['tax','irs'],
    extractor: 'irs_ein'
  })
}

const eeoc15: Maker = async (rd) => {
  if (!rd.url.includes('eeoc.gov')) return null
  return makeRule({
    title: 'EEOC Anti-Discrimination Coverage (15+ employees)',
    description: 'Most federal EEO laws apply to employers with 15+ employees (20+ for ADEA).',
    jurisdiction: 'federal',
    authority: 'EEOC',
    scope: { geography: { country: 'US' }, minEmployees: 15 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Adopt and enforce anti-discrimination policies' },
      { action: 'Post EEO notices and provide training as appropriate' }
    ],
    references: [{ label: 'EEOC Overview', url: rd.url }],
    tags: ['eeo','hr'],
    extractor: 'eeoc_threshold'
  })
}

const nycTraining: Maker = async (rd) => {
  if (!rd.url.includes('nyc.gov') || !rd.url.toLowerCase().includes('harassment')) return null
  return makeRule({
    title: 'NYC: Sexual Harassment Training',
    description: 'NYC requires annual sexual harassment training for employers above thresholds.',
    jurisdiction: 'local',
    authority: 'NYC',
    scope: { geography: { states: ['NY'], cities: ['New York'] }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Provide annual harassment training meeting NYC standards' }],
    references: [{ label: 'NYC Training', url: rd.url }],
    tags: ['nyc','training'],
    extractor: 'nyc_training'
  })
}

const EXTRACTORS: Maker[] = [
  oshaPoster, oshaRecordkeeping, dolFlsa, hhsHipaa, cppaCcpa, nyHarassment, sfFood,
  irsEIN, eeoc15, nycTraining
]

// ----------------- MAIN: transform RawDoc → Rule -----------------
async function main() {
  const raws = await db.rawDoc.findMany({ orderBy: { fetchedAt: 'desc' } })
  let created = 0
  for (const rd of raws) {
    // try each extractor until one matches
    for (const make of EXTRACTORS) {
      const rule = await make({ id: rd.id, url: rd.url, source: rd.source })
      if (!rule) continue

      // de-dup: title + authority
      const exists = await db.rule.findFirst({
        where: { title: rule.title, authority: rule.authority }
      })
      if (!exists) {
        await db.rule.create({
          data: {
            ...rule,
            scope: rule.scope,
            conditions: rule.conditions,
            requirements: rule.requirements,
            references: rule.references,
            tags: rule.tags,
            sourceDocId: rd.id
          } as any
        })
        created++
      }
      // mark processed (optional)
      await db.rawDoc.update({
        where: { id: rd.id },
        data: { processedAt: new Date(), extractor: rule.extractor }
      })
      break
    }
  }
  console.log(`Transform complete. Created ${created} new rules.`)
}

main()
  .then(() => db.$disconnect())
  .catch(e => { console.error(e); process.exit(1) })
