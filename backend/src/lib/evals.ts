import type { BizInput } from "./zod";

type Predicate =
  | { field: keyof BizInput; op: "eq"|"neq"|"gte"|"gt"|"lte"|"lt"|"in"|"startsWith"; value: any }
  | { custom: "hasEmployees"|"isPublicFacing"|"handlesPHI"|"servesAlcohol"|"handlesFood"|"collectsPII" };

type RuleJSON = {
  jurisdiction: "federal"|"state"|"local";
  scope?: {
    geography?: { country?: "US"; states?: string[]; counties?: string[]; cities?: string[]; };
    industries?: { naicsPrefix: string; label?: string }[];
    minEmployees?: number;
  };
  conditions: { mode: "all"|"any"; predicates: Predicate[] };
};

const evalPredicate = (p: Predicate, input: BizInput): boolean => {
  if ("custom" in p) {
    switch (p.custom) {
      case "hasEmployees":   return input.hasEmployees && input.employees > 0;
      case "isPublicFacing": return input.publicFacing;
      case "handlesPHI":     return input.handlesPHI;
      case "servesAlcohol":  return input.servesAlcohol;
      case "handlesFood":    return input.handlesFood;
      case "collectsPII":    return input.collectsPII;
    }
  }
  const left: any = input[p.field];
  const right: any = p.value;
  switch (p.op) {
    case "eq": return left === right;
    case "neq": return left !== right;
    case "gte": return Number(left ?? 0) >= Number(right);
    case "gt":  return Number(left ?? 0) > Number(right);
    case "lte": return Number(left ?? 0) <= Number(right);
    case "lt":  return Number(left ?? 0) < Number(right);
    case "in":  return Array.isArray(right) && right.includes(left);
    case "startsWith": return typeof left === "string" && typeof right === "string" && left.startsWith(right);
    default: return false;
  }
};

const geoMatch = (scope: RuleJSON["scope"]|undefined, input: BizInput) => {
  const g = scope?.geography;
  if (!g) return true;
  if (g.country && g.country !== "US") return false;
  if (g.states?.length && !g.states.includes(input.state)) return false;
  if (g.cities?.length && !g.cities.map(c=>c.toLowerCase()).includes(input.city.toLowerCase())) return false;
  return true;
};
const industryMatch = (scope: RuleJSON["scope"]|undefined, input: BizInput) => {
  const ind = scope?.industries;
  if (!ind?.length) return true;
  return ind.some(i => input.naics.startsWith(i.naicsPrefix));
};
const headcountMatch = (scope: RuleJSON["scope"]|undefined, input: BizInput) => {
  if (scope?.minEmployees && input.employees < scope.minEmployees) return false;
  return true;
};

export function ruleApplies(rule: RuleJSON, input: BizInput) {
  if (!geoMatch(rule.scope, input)) return false;
  if (!industryMatch(rule.scope, input)) return false;
  if (!headcountMatch(rule.scope, input)) return false;
  const { mode, predicates } = rule.conditions;
  return mode === "all"
    ? predicates.every(p => evalPredicate(p, input))
    : predicates.some(p => evalPredicate(p, input));
}
