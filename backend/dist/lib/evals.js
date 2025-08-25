"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleApplies = ruleApplies;
const evalPredicate = (p, input) => {
    if ("custom" in p) {
        switch (p.custom) {
            case "hasEmployees": return input.hasEmployees && input.employees > 0;
            case "isPublicFacing": return input.publicFacing;
            case "handlesPHI": return input.handlesPHI;
            case "servesAlcohol": return input.servesAlcohol;
            case "handlesFood": return input.handlesFood;
            case "collectsPII": return input.collectsPII;
        }
    }
    const left = input[p.field];
    const right = p.value;
    switch (p.op) {
        case "eq": return left === right;
        case "neq": return left !== right;
        case "gte": return Number(left ?? 0) >= Number(right);
        case "gt": return Number(left ?? 0) > Number(right);
        case "lte": return Number(left ?? 0) <= Number(right);
        case "lt": return Number(left ?? 0) < Number(right);
        case "in": return Array.isArray(right) && right.includes(left);
        case "startsWith": return typeof left === "string" && typeof right === "string" && left.startsWith(right);
        default: return false;
    }
};
const geoMatch = (scope, input) => {
    const g = scope?.geography;
    if (!g)
        return true;
    if (g.country && g.country !== "US")
        return false;
    if (g.states?.length && !g.states.includes(input.state))
        return false;
    if (g.cities?.length && !g.cities.map(c => c.toLowerCase()).includes(input.city.toLowerCase()))
        return false;
    return true;
};
const industryMatch = (scope, input) => {
    const ind = scope?.industries;
    if (!ind?.length)
        return true;
    return ind.some(i => input.naics.startsWith(i.naicsPrefix));
};
const headcountMatch = (scope, input) => {
    if (scope?.minEmployees && input.employees < scope.minEmployees)
        return false;
    return true;
};
function ruleApplies(rule, input) {
    if (!geoMatch(rule.scope, input))
        return false;
    if (!industryMatch(rule.scope, input))
        return false;
    if (!headcountMatch(rule.scope, input))
        return false;
    const { mode, predicates } = rule.conditions;
    return mode === "all"
        ? predicates.every(p => evalPredicate(p, input))
        : predicates.some(p => evalPredicate(p, input));
}
