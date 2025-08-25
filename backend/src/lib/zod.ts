import { optional, z } from "zod";

export const BizInputZ = z.object({
  state: z.string().length(2),
  city: z.string().optional(),
  zip: z.string().optional(),
  naics: z.string().optional(),
  employees: z.number().optional(),
  revenueUSD: z.number().optional(),
  publicFacing: z.boolean(),
  hasEmployees: z.boolean(),
  handlesPHI: z.boolean(),
  servesAlcohol: z.boolean(),
  handlesFood: z.boolean(),
  collectsPII: z.boolean(),
  ecommerce: z.boolean()
});
export type BizInput = z.infer<typeof BizInputZ>;
