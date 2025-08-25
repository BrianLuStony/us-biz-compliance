"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BizInputZ = void 0;
const zod_1 = require("zod");
exports.BizInputZ = zod_1.z.object({
    state: zod_1.z.string().length(2),
    city: zod_1.z.string().min(1),
    zip: zod_1.z.string().min(3).max(10),
    naics: zod_1.z.string().min(2),
    employees: zod_1.z.number().int().min(0),
    revenueUSD: zod_1.z.number().int().min(0).optional(),
    publicFacing: zod_1.z.boolean(),
    hasEmployees: zod_1.z.boolean(),
    handlesPHI: zod_1.z.boolean(),
    servesAlcohol: zod_1.z.boolean(),
    handlesFood: zod_1.z.boolean(),
    collectsPII: zod_1.z.boolean(),
    ecommerce: zod_1.z.boolean()
});
