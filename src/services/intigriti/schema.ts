import { z } from 'zod'

export const enumerationSchema = z.object({
  id: z.number().int(),
  value: z.string()
})

export const moneySchema = z.object({
  value: z.number(),
  currency: z.string()
})

export const webLinksSchema = z.object({
  detail: z.string()
})

export const programOverviewSchema = z.object({
  id: z.string().uuid(),
  handle: z.string(),
  name: z.string(),
  following: z.boolean(),
  minBounty: moneySchema.nullable().optional(),
  maxBounty: moneySchema.nullable().optional(),
  confidentialityLevel: enumerationSchema,
  status: enumerationSchema,
  type: enumerationSchema,
  webLinks: webLinksSchema,
  industry: z.string().nullable().optional()
})

export const skillSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const domainSchema = z.object({
  id: z.string().uuid(),
  type: enumerationSchema,
  endpoint: z.string(),
  tier: enumerationSchema,
  description: z.string(),
  requiredSkills: z.array(skillSchema)
})

export const domainsVersionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int(),
  content: z.array(domainSchema).nullable()
})

export const programDomainsSchema = z.object({
  domains: domainsVersionSchema
})

export const testingRequirementsSchema = z.object({
  intigritiMe: z.boolean(),
  automatedTooling: z.number().int().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  requestHeader: z.string().nullable().optional()
})

export const roeContentSchema = z.object({
  description: z.string(),
  testingRequirements: testingRequirementsSchema,
  safeHarbour: z.boolean()
})

export const attachmentSchema = z.object({
  url: z.string(),
  code: z.number().int()
})

export const roeVersionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int(),
  content: roeContentSchema.nullable(),
  attachments: z.array(attachmentSchema)
})

export const programRulesSchema = z.object({
  rulesOfEngagement: roeVersionSchema
})

export const programDetailSchema = z.object({
  id: z.string().uuid(),
  handle: z.string(),
  name: z.string(),
  following: z.boolean(),
  confidentialityLevel: enumerationSchema,
  status: enumerationSchema,
  type: enumerationSchema,
  domains: domainsVersionSchema,
  rulesOfEngagement: roeVersionSchema.nullable(),
  webLinks: webLinksSchema,
  industry: z.string().nullable().optional()
})

export const programActivitySchema = z.object({
  programId: z.string().uuid(),
  activity: z.record(z.string(), z.unknown()),
  type: enumerationSchema,
  createdAt: z.number().int(),
  following: z.boolean()
})

export function paginationSchema<T extends z.ZodTypeAny>(item: T): z.ZodType<{ maxCount: number; records: z.infer<T>[] }> {
  return z.object({
    maxCount: z.number().int(),
    records: z.array(item)
  })
}

export const programOverviewPageSchema = paginationSchema(programOverviewSchema)
export const programActivityPageSchema = paginationSchema(programActivitySchema)

export type Enumeration = z.infer<typeof enumerationSchema>
export type Money = z.infer<typeof moneySchema>
export type WebLinks = z.infer<typeof webLinksSchema>
export type ProgramOverview = z.infer<typeof programOverviewSchema>
export type Skill = z.infer<typeof skillSchema>
export type Domain = z.infer<typeof domainSchema>
export type DomainsVersion = z.infer<typeof domainsVersionSchema>
export type TestingRequirements = z.infer<typeof testingRequirementsSchema>
export type RulesOfEngagement = z.infer<typeof roeContentSchema>
export type Attachment = z.infer<typeof attachmentSchema>
export type RulesVersion = z.infer<typeof roeVersionSchema>
export type ProgramDomains = z.infer<typeof programDomainsSchema>
export type ProgramRules = z.infer<typeof programRulesSchema>
export type ProgramDetail = z.infer<typeof programDetailSchema>
export type ProgramActivity = z.infer<typeof programActivitySchema>
export type Page<T> = { maxCount: number; records: T[] }