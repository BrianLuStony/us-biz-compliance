import { z } from "zod";

export const BizInputZ = z.object({
  state: z.string().length(2),
  city: z.string().min(1),
  zip: z.string().min(3).max(10),
  naics: z.string().min(2),
  employees: z.number().int().min(0),
  revenueUSD: z.number().int().min(0).optional(),
  publicFacing: z.boolean(),
  hasEmployees: z.boolean(),
  handlesPHI: z.boolean(),
  servesAlcohol: z.boolean(),
  handlesFood: z.boolean(),
  collectsPII: z.boolean(),
  ecommerce: z.boolean()
});
export type BizInput = z.infer<typeof BizInputZ>;
