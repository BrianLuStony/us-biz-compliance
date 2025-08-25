// scripts/ingest_catalog.ts
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import YAML from 'yaml'
import { z } from 'zod'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

const db = new PrismaClient()

const wait = (ms:number)=>new Promise(r=>setTimeout(r,ms))
async function fetchWithUA(url:string, tries=3): Promise<string> {
  let last:any
  for (let i=0;i<tries;i++){
    try{
      const res = await fetch(url, { headers: {
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    }catch(e){ last=e; await wait(300*(i+1)) }
  }
  throw last
}

async function upsertRaw(url:string, source:string){
  try{
    const html = await fetchWithUA(url,3)
    const $ = cheerio.load(html)
    const title = $('title').first().text().trim() || null
    const raw = await db.rawDoc.upsert({
      where:{ url },
      update:{ source, payload:{ url, title, fetchedAt:new Date().toISOString() }},
      create:{ url, source, payload:{ url, title, fetchedAt:new Date().toISOString() }},
    })
    return { rawId: raw.id, title }
  }catch{
    const raw = await db.rawDoc.upsert({
      where:{ url },
      update:{ payload:{ url, title:null, note:'Fetch failed; stored URL only' }},
      create:{ url, source, payload:{ url, title:null, note:'Fetch failed; stored URL only' }},
    })
    return { rawId: raw.id, title: null as string|null }
  }
}

async function ensureRule(args:any){
  const exists = await db.rule.findFirst({ where:{ title: args.title, authority: args.authority }})
  if (exists) return exists
  return db.rule.create({ data: args })
}

const CatalogSchema = z.array(z.object({
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  jurisdiction: z.enum(['federal','state','local']),
  authority: z.string(),
  scope: z.any(),
  conditions: z.any(),
  requirements: z.array(z.object({ action:z.string(), details:z.string().optional() })),
  tags: z.array(z.string()).default([]),
}))

;(async()=>{
  const file = path.join(process.cwd(), 'data', 'rules.catalog.yml')
  const text = fs.readFileSync(file, 'utf8')
  const parsed = CatalogSchema.parse(YAML.parse(text))

  let created = 0, skipped = 0
  for (const item of parsed){
    const { rawId } = await upsertRaw(item.url, item.source)
    const existed = await db.rule.findFirst({ where:{ title:item.title, authority:item.authority }})
    if (existed){ skipped++; continue }
    await ensureRule({
      title: item.title,
      jurisdiction: item.jurisdiction,
      authority: item.authority,
      scope: item.scope,
      conditions: item.conditions,
      requirements: item.requirements,
      references: [{ label: item.title, url: item.url }],
      tags: item.tags,
      sourceDocId: rawId
    })
    created++
  }
  console.log(`Catalog ingest complete. created=${created}, skipped=${skipped}`)
  await db.$disconnect()
})().catch(e=>{ console.error(e); process.exit(1) })
