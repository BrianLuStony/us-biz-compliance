// ts-node scripts/ingest.ts
import 'dotenv/config'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

type Ref = { label: string; url: string }

const wait = (ms: number) => new Promise(res => setTimeout(res, ms))

async function fetchWithUA(url: string, tries = 3): Promise<string> {
  let lastErr: any
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (res.status === 403 || res.status === 406) {
        lastErr = new Error(`HTTP ${res.status}`)
        await wait(500 * (i + 1))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      lastErr = err
      await wait(500 * (i + 1))
    }
  }
  throw lastErr
}

async function upsertRaw(url: string, source: string) {
  let title: string | null = null
  try {
    const html = await fetchWithUA(url, 3)
    const $ = cheerio.load(html)
    title = $('title').first().text().trim() || null
  } catch {
    // ignore; we still store URL so we have a traceable reference
  }
  const payload = title
    ? { url, title, fetchedAt: new Date().toISOString() }
    : { url, title: null, note: 'Fetch blocked. Stored URL only.' }

  const raw = await db.rawDoc.upsert({
    where: { url },
    update: { payload },
    create: { url, source, payload }
  })
  return { rawId: raw.id, title }
}

async function ensureRule(args: {
  title: string
  description?: string
  jurisdiction: 'federal'|'state'|'local'
  authority: string
  scope: any
  conditions: any
  requirements: { action: string; details?: string }[]
  penalties?: string
  references: Ref[]
  tags: string[]
  sourceDocId: string
}) {
  const exists = await db.rule.findFirst({
    where: { title: args.title, authority: args.authority }
  })
  if (exists) return exists
  return db.rule.create({ data: args as any })
}

async function createRuleFrom(
  url: string,
  source: string,
  rule: Omit<Parameters<typeof ensureRule>[0], 'sourceDocId' | 'references'>
) {
  const { rawId } = await upsertRaw(url, source)
  return ensureRule({
    ...rule,
    references: [{ label: rule.title, url }],
    sourceDocId: rawId
  })
}

/* ------------------ Canonical ingesters (create Rules) ------------------ */

async function ingestOshaPoster() {
  const url = 'https://www.osha.gov/publications/poster'
  const { rawId } = await upsertRaw(url, 'osha.gov')
  await ensureRule({
    title: 'Post OSHA Job Safety & Health Protection Poster',
    description: 'Display the OSHA poster in a conspicuous workplace location.',
    jurisdiction: 'federal',
    authority: 'OSHA (DOL)',
    scope: { geography: { country: 'US' }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Display OSHA 3165 poster' }],
    penalties: 'Citations possible if not posted.',
    references: [{ label: 'OSHA Poster', url }],
    tags: ['labor','poster','workplace'],
    sourceDocId: rawId
  })
}

async function ingestOshaRecordkeeping() {
  const url = 'https://www.osha.gov/recordkeeping'
  const { rawId } = await upsertRaw(url, 'osha.gov')
  await ensureRule({
    title: 'OSHA Recordkeeping (Injury & Illness Logs)',
    description: 'Employers with >10 employees generally must keep OSHA injury/illness records.',
    jurisdiction: 'federal',
    authority: 'OSHA (DOL)',
    scope: { geography: { country: 'US' }, minEmployees: 11 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Maintain OSHA 300/300A/301 logs as applicable' }],
    references: [{ label: 'OSHA Recordkeeping', url }],
    tags: ['safety','recordkeeping'],
    sourceDocId: rawId
  })
}

async function ingestFlsa() {
  const url = 'https://www.dol.gov/agencies/whd/flsa'
  const { rawId } = await upsertRaw(url, 'dol.gov')
  await ensureRule({
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
    references: [{ label: 'FLSA Overview', url }],
    tags: ['wage','overtime'],
    sourceDocId: rawId
  })
}

async function ingestHipaa() {
  const url = 'https://www.hhs.gov/hipaa/for-professionals/index.html'
  const { rawId } = await upsertRaw(url, 'hhs.gov')
  await ensureRule({
    title: 'HIPAA – Covered Entity/Business Associate',
    description: 'If you handle PHI and are a covered entity/BA, HIPAA privacy/security rules apply.',
    jurisdiction: 'federal',
    authority: 'HHS',
    scope: {
      geography: { country: 'US' },
      industries: [{ naicsPrefix: '62', label: 'Healthcare' }]
    },
    conditions: { mode: 'all', predicates: [{ custom: 'handlesPHI' }] },
    requirements: [
      { action: 'Appoint privacy & security officer' },
      { action: 'Implement HIPAA Privacy/Security/Breach policies' },
      { action: 'Execute BAAs with vendors' }
    ],
    references: [{ label: 'HHS HIPAA', url }],
    tags: ['privacy','health'],
    sourceDocId: rawId
  })
}

async function ingestCcpa() {
  const url = 'https://cppa.ca.gov/'
  const { rawId } = await upsertRaw(url, 'cppa.ca.gov')
  await ensureRule({
    title: 'California CCPA/CPRA Applicability',
    description: 'Applies to certain businesses doing business in CA meeting revenue/volume thresholds.',
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
    references: [{ label: 'CPPA Portal', url }],
    tags: ['privacy','california'],
    sourceDocId: rawId
  })
}

async function ingestEEOC() {
  const url = 'https://www.eeoc.gov/employers'
  const { rawId } = await upsertRaw(url, 'eeoc.gov')
  await ensureRule({
    title: 'EEOC Anti-Discrimination Coverage (15+ employees)',
    description: 'Most federal EEO laws apply to employers with 15+ employees (20+ for ADEA).',
    jurisdiction: 'federal',
    authority: 'EEOC',
    scope: { geography: { country: 'US' }, minEmployees: 15 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Adopt and enforce anti-discrimination policies' },
      { action: 'Post EEO notices and train supervisors appropriately' }
    ],
    references: [{ label: 'EEOC Employers', url }],
    tags: ['eeo','hr'],
    sourceDocId: rawId
  })
}

async function ingestIRSEIN() {
  const url = 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online'
  const { rawId } = await upsertRaw(url, 'irs.gov')
  await ensureRule({
    title: 'Obtain an EIN (Employer Identification Number)',
    description: 'Most employers and many businesses need an EIN for tax administration.',
    jurisdiction: 'federal',
    authority: 'IRS',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'any', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Apply for EIN online (free)' }],
    references: [{ label: 'IRS EIN', url }],
    tags: ['tax','irs'],
    sourceDocId: rawId
  })
}

async function ingestNYCTraining() {
  const url = 'https://www.nyc.gov/site/cchr/law/sexual-harassment-training.page'
  const { rawId } = await upsertRaw(url, 'nyc.gov')
  await ensureRule({
    title: 'NYC: Sexual Harassment Training',
    description: 'NYC requires annual harassment training (local law) for covered employers.',
    jurisdiction: 'local',
    authority: 'NYC',
    scope: { geography: { states: ['NY'], cities: ['New York'] }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [{ action: 'Provide annual NYC-compliant harassment training' }],
    references: [{ label: 'NYC CCHR Training', url }],
    tags: ['nyc','training'],
    sourceDocId: rawId
  })
}

async function ingestCAIIPP() {
  const url = 'https://www.dir.ca.gov/dosh/etools/09-031/'
  const { rawId } = await upsertRaw(url, 'dir.ca.gov')
  await ensureRule({
    title: 'California: Injury & Illness Prevention Program (IIPP)',
    description: 'Most CA employers must implement a written IIPP.',
    jurisdiction: 'state',
    authority: 'Cal/OSHA',
    scope: { geography: { states: ['CA'] }, minEmployees: 1 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Create written IIPP' },
      { action: 'Train employees; identify & correct hazards' }
    ],
    references: [{ label: 'Cal/OSHA IIPP', url }],
    tags: ['california','safety'],
    sourceDocId: rawId
  })
}

async function ingestFTCPrivacy() {
  const url = 'https://www.ftc.gov/business-guidance/privacy-security'
  const { rawId } = await upsertRaw(url, 'ftc.gov')
  await ensureRule({
    title: 'FTC: Privacy & Data Security Basics',
    description: 'If you collect personal information, follow FTC’s privacy and data security guidance.',
    jurisdiction: 'federal',
    authority: 'FTC',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'all', predicates: [{ field: 'collectsPII', op: 'eq', value: true }] },
    requirements: [
      { action: 'Provide clear privacy notices & choices' },
      { action: 'Safeguard data; limit collection/retention' }
    ],
    references: [{ label: 'FTC Privacy & Security', url }],
    tags: ['privacy','consumer'],
    sourceDocId: rawId
  })
}

async function ingestADA() {
  const url = 'https://www.ada.gov/resources/business/'
  const { rawId } = await upsertRaw(url, 'ada.gov')
  await ensureRule({
    title: 'ADA: Public Accommodations Obligations',
    description: 'Businesses open to the public must remove barriers and provide reasonable accommodations.',
    jurisdiction: 'federal',
    authority: 'DOJ (ADA)',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'all', predicates: [{ field: 'publicFacing', op: 'eq', value: true }] },
    requirements: [
      { action: 'Ensure accessible access/communication as applicable' }
    ],
    references: [{ label: 'ADA Business Resources', url }],
    tags: ['accessibility','public'],
    sourceDocId: rawId
  })
}

async function ingestSfFood() {
  const url = 'https://www.sfdph.org/dph/eh/food/'
  const { rawId } = await upsertRaw(url, 'sfdph.org')
  await ensureRule({
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
    references: [{ label: 'SFDPH Food', url }],
    tags: ['san-francisco','food'],
    sourceDocId: rawId
  })
}
/* ---------- USCIS: Form I-9 (all employers) ---------- */
async function ingestUSCISI9() {
  const url = 'https://www.uscis.gov/i-9'
  await createRuleFrom(url, 'uscis.gov', {
    title: 'USCIS: Form I-9 Employment Eligibility Verification',
    description: 'All U.S. employers must verify identity and employment authorization for each employee (Form I-9).',
    jurisdiction: 'federal',
    authority: 'USCIS (DHS)',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Complete Form I-9 for each new hire within 3 business days' },
      { action: 'Retain I-9s and make available for inspection' }
    ],
    tags: ['hiring','eligibility','form']
  })
}

/* ---------- IRS: Form W-4/W-2 (payroll tax onboarding) ---------- */
async function ingestIRSW4W2() {
  const url = 'https://www.irs.gov/forms-pubs/about-form-w-4'
  await createRuleFrom(url, 'irs.gov', {
    title: 'IRS: Collect Form W-4 and Issue Form W-2',
    description: 'Employers must collect W-4 from employees and issue W-2 annually for wages paid.',
    jurisdiction: 'federal',
    authority: 'IRS',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Collect Form W-4 from each employee' },
      { action: 'Issue Form W-2 to employees by Jan 31 and file with SSA' }
    ],
    tags: ['tax','payroll']
  })
}

/* ---------- OSHA: Personal Protective Equipment (PPE) hazard assessment ---------- */
async function ingestOshaPPE() {
  const url = 'https://www.osha.gov/personal-protective-equipment'
  await createRuleFrom(url, 'osha.gov', {
    title: 'OSHA: PPE Hazard Assessment & Provision',
    description: 'Assess workplace hazards and provide appropriate PPE with training.',
    jurisdiction: 'federal',
    authority: 'OSHA (DOL)',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Conduct and document PPE hazard assessment' },
      { action: 'Provide PPE and training at no cost to employees' }
    ],
    tags: ['safety','ppe']
  })
}

/* ---------- OSHA: Bloodborne Pathogens (healthcare / exposure) ---------- */
async function ingestOshaBBP() {
  const url = 'https://www.osha.gov/bloodborne-pathogens'
  await createRuleFrom(url, 'osha.gov', {
    title: 'OSHA: Bloodborne Pathogens Standard',
    description: 'If employees may be exposed to blood or OPIM, implement BBP program and controls.',
    jurisdiction: 'federal',
    authority: 'OSHA (DOL)',
    scope: { geography: { country: 'US' }, industries: [{ naicsPrefix: '62', label: 'Healthcare' }] },
    conditions: { mode: 'any', predicates: [{ custom: 'handlesPHI' }, { field: 'exposureBlood', op: 'eq', value: true }] },
    requirements: [
      { action: 'Develop Exposure Control Plan; offer Hep B vaccine; train annually' }
    ],
    tags: ['safety','healthcare']
  })
}

/* ---------- DOL: FMLA (50+ employees) ---------- */
async function ingestFMLA() {
  const url = 'https://www.dol.gov/agencies/whd/fmla'
  await createRuleFrom(url, 'dol.gov', {
    title: 'FMLA: Family and Medical Leave (50+ employees)',
    description: 'Covered employers must provide job-protected leave and maintain health coverage.',
    jurisdiction: 'federal',
    authority: 'Wage and Hour Division (DOL)',
    scope: { geography: { country: 'US' }, minEmployees: 50 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Post FMLA notice; include in handbook or distribute' },
      { action: 'Provide up to 12 weeks of job-protected leave for eligible employees' }
    ],
    tags: ['leave','policy']
  })
}

/* ---------- CA: Paid Sick Leave (statewide) ---------- */
async function ingestCAPaidSickLeave() {
  const url = 'https://www.dir.ca.gov/dlse/paid_sick_leave.htm'
  await createRuleFrom(url, 'dir.ca.gov', {
    title: 'California: Paid Sick Leave',
    description: 'CA requires paid sick leave accrual and use with notice to employees.',
    jurisdiction: 'state',
    authority: 'California DIR (DLSE)',
    scope: { geography: { states: ['CA'] } },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Provide PSL accrual (or frontload) and allow usage per CA rules' },
      { action: 'Provide written notice and maintain records' }
    ],
    tags: ['california','leave']
  })
}

/* ---------- CA: Heat Illness Prevention (outdoor) ---------- */
async function ingestCAHeatIllness() {
  const url = 'https://www.dir.ca.gov/dosh/heatillnessinfo.html'
  await createRuleFrom(url, 'dir.ca.gov', {
    title: 'California: Heat Illness Prevention (Outdoor Work)',
    description: 'Outdoor workplaces must provide water, shade, training, and procedures for heat illness.',
    jurisdiction: 'state',
    authority: 'Cal/OSHA',
    scope: { geography: { states: ['CA'] } },
    conditions: { mode: 'any', predicates: [{ field: 'outdoorWork', op: 'eq', value: true }] },
    requirements: [
      { action: 'Adopt written Heat Illness Prevention Plan; provide water, shade, rest' }
    ],
    tags: ['california','safety']
  })
}

/* ---------- CA: Harassment Training (5+ employees) ---------- */
async function ingestCAHarassmentTraining() {
  const url = 'https://www.dfeh.ca.gov/wp-content/uploads/sites/32/2019/08/CRD_FAQ_Training.pdf'
  await createRuleFrom(url, 'calcivilrights.ca.gov', {
    title: 'California: Sexual Harassment Training (5+ employees)',
    description: 'CA requires supervisor and employee harassment training for employers with 5+ employees.',
    jurisdiction: 'state',
    authority: 'California Civil Rights Department',
    scope: { geography: { states: ['CA'] }, minEmployees: 5 },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Provide 2h supervisor & 1h employee training every 2 years (or within 6 months of hire/promotion)' }
    ],
    tags: ['california','training']
  })
}

/* ---------- NY State: Paid Sick Leave ---------- */
async function ingestNYPaidSickLeave() {
  const url = 'https://dol.ny.gov/paid-sick-leave'
  await createRuleFrom(url, 'ny.gov', {
    title: 'New York State: Paid Sick Leave',
    description: 'NY requires sick leave; amount depends on employer size and net income.',
    jurisdiction: 'state',
    authority: 'New York State DOL',
    scope: { geography: { states: ['NY'] } },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Provide sick leave accrual/use per NY rules; maintain records' }
    ],
    tags: ['new-york','leave']
  })
}

/* ---------- NY State: Paid Family Leave (insurance) ---------- */
async function ingestNYPFL() {
  const url = 'https://paidfamilyleave.ny.gov/employers'
  await createRuleFrom(url, 'ny.gov', {
    title: 'New York State: Paid Family Leave (PFL)',
    description: 'Most NY employers must obtain PFL insurance coverage and provide leave/benefits.',
    jurisdiction: 'state',
    authority: 'New York State',
    scope: { geography: { states: ['NY'] } },
    conditions: { mode: 'all', predicates: [{ custom: 'hasEmployees' }] },
    requirements: [
      { action: 'Obtain PFL coverage (often via disability insurance carrier)' },
      { action: 'Post required notice and handle payroll deductions/benefits' }
    ],
    tags: ['new-york','leave','insurance']
  })
}

/* ---------- NYC: Food Service Establishment Permit ---------- */
async function ingestNYCFoodPermit() {
  const url = 'https://www.nyc.gov/site/doh/services/food-service-establishment-permit.page'
  await createRuleFrom(url, 'nyc.gov', {
    title: 'NYC: Food Service Establishment Permit',
    description: 'Restaurants and similar establishments must obtain a DOHMH permit before operating.',
    jurisdiction: 'local',
    authority: 'NYC DOHMH',
    scope: {
      geography: { states: ['NY'], cities: ['New York'] },
      industries: [{ naicsPrefix: '722', label: 'Food Services and Drinking Places' }]
    },
    conditions: { mode: 'all', predicates: [{ custom: 'handlesFood' }] },
    requirements: [
      { action: 'Apply for Food Service Establishment Permit with NYC DOHMH' },
      { action: 'Have a certified food protection manager on site' }
    ],
    tags: ['nyc','food','permit']
  })
}

/* ---------- NYC: Weights & Measures (for retail) – good practice ---------- */
async function ingestNYCWeightsMeasures() {
  const url = 'https://www.nyc.gov/site/dca/businesses/weights-and-measures.page'
  await createRuleFrom(url, 'nyc.gov', {
    title: 'NYC: Weights & Measures (Retail Scales/Packaging)',
    description: 'Retailers using scales or selling packaged goods must comply with NYC weights & measures.',
    jurisdiction: 'local',
    authority: 'NYC',
    scope: { geography: { states: ['NY'], cities: ['New York'] } },
    conditions: { mode: 'any', predicates: [{ field: 'publicFacing', op: 'eq', value: true }] },
    requirements: [
      { action: 'Use approved/calibrated devices; follow labeling/packaging rules' }
    ],
    tags: ['nyc','retail','good-practice']
  })
}
async function ingestPCIDSS() {
  const url = 'https://www.pcisecuritystandards.org/pci_security/'
  await createRuleFrom(url, 'pcisecuritystandards.org', {
    title: 'PCI DSS: Cardholder Data Security (Good Practice)',
    description: 'If you accept credit cards (especially online), follow PCI DSS to protect cardholder data.',
    jurisdiction: 'federal', // categorize for grouping
    authority: 'PCI Security Standards Council',
    scope: { geography: { country: 'US' } },
    conditions: { mode: 'all', predicates: [{ field: 'ecommerce', op: 'eq', value: true }] },
    requirements: [
      { action: 'Use PCI-compliant processors; avoid storing card numbers/CVV' },
      { action: 'Complete SAQ/attestation required by your provider' }
    ],
    tags: ['security','payments','good-practice']
  })
}


/* ----------- Optional discovery: store Federal Register references ----------- */
async function ingestFederalRegisterReferences(query = 'OSHA recordkeeping') {
  const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest&conditions[term]=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return
    const json: any = await res.json()
    for (const d of json.results ?? []) {
      const pageUrl = d.html_url
      await upsertRaw(pageUrl, 'federalregister.gov')
    }
  } catch {
    // ignore
  }
}

/* ------------------------------ run all ------------------------------ */
;(async () => {
    await ingestOshaPoster()
    await ingestOshaRecordkeeping()
    await ingestFlsa()
    await ingestHipaa()
    await ingestCcpa()
    await ingestEEOC()
    await ingestIRSEIN()
    await ingestNYCTraining()
    await ingestCAIIPP()
    await ingestFTCPrivacy()
    await ingestADA()
    await ingestSfFood()

    await ingestUSCISI9()
    await ingestIRSW4W2()
    await ingestOshaPPE()
    await ingestOshaBBP()
    await ingestFMLA()

    await ingestCAPaidSickLeave()
    await ingestCAHeatIllness()
    await ingestCAHarassmentTraining()

    await ingestNYPaidSickLeave()
    await ingestNYPFL()

    await ingestNYCFoodPermit()
    await ingestNYCWeightsMeasures()    
    await ingestPCIDSS()

    // references only (not rules) — keeps provenance for your dataset
    await ingestFederalRegisterReferences('OSHA recordkeeping')
    await ingestFederalRegisterReferences('FLSA overtime')
    await ingestFederalRegisterReferences('HIPAA privacy rule')

    console.log('Ingestion complete.')
    await db.$disconnect()
})().catch(e => { console.error(e); process.exit(1) })
