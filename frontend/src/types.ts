export type BizInput = {
  state: string
  city?: string
  zip?: string
  naics?: string
  employees?: number
  revenueUSD?: number
  publicFacing?: boolean
  hasEmployees?: boolean
  handlesPHI?: boolean
  handlesFood?: boolean
  servesAlcohol?: boolean
  collectsPII?: boolean
  ecommerce?: boolean
  outdoorWork?: boolean
  exposureBlood?: boolean
}
export type RuleDto = {
  id: string
  title: string
  description?: string
  jurisdiction: 'federal'|'state'|'local'
  authority: string
  requirements: { action: string; details?: string }[]
  references: { label: string; url: string }[]
  tags: string[]
}

export type EvaluateResponse = {
  input: BizInput
  matched: RuleDto[]
  stats: { poolCount: number; matchedCount: number }
  warnings?: string[]              // 👈 add this
}

export type StatsResponse = {
  byJurisdiction: { jurisdiction: string; count: number }[]
  byAuthority: { authority: string; count: number }[]
}
