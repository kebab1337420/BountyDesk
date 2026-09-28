import { describe, expect, it } from 'vitest'
import {
  programActivityPageSchema,
  programDetailSchema,
  programDomainsSchema,
  programOverviewPageSchema,
  programRulesSchema
} from '../src/services/intigriti/schema'

describe('schémas Intigriti (issus de la spec OpenAPI)', () => {
  it('accepte une réponse /v1/programs réelle', () => {
    const payload = {
      maxCount: 1,
      records: [
        {
          id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4187',
          handle: 'acme',
          name: 'ACME Security',
          following: true,
          minBounty: { value: 250, currency: 'EUR' },
          maxBounty: { value: 5000, currency: 'EUR' },
          confidentialityLevel: { id: 3, value: 'public' },
          status: { id: 1, value: 'active' },
          type: { id: 1, value: 'web' },
          webLinks: { detail: 'https://intigriti.com/programs/acme' },
          industry: 'computer software'
        }
      ]
    }
    expect(programOverviewPageSchema.safeParse(payload).success).toBe(true)
  })

  it('accepte un programme VDP sans bounty', () => {
    const payload = {
      maxCount: 1,
      records: [
        {
          id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4187',
          handle: 'novdp',
          name: 'No Bounty',
          following: true,
          confidentialityLevel: { id: 3, value: 'public' },
          status: { id: 1, value: 'active' },
          type: { id: 2, value: 'vdp' },
          webLinks: { detail: 'https://intigriti.com/programs/novdp' }
        }
      ]
    }
    const result = programOverviewPageSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('rejette une réponse malformée', () => {
    const payload = { maxCount: 1, records: [{ id: 'pas-un-guid', handle: 42 }] }
    expect(programOverviewPageSchema.safeParse(payload).success).toBe(false)
  })

  it('valide le détail d’un programme (domaines + ROE)', () => {
    const payload = {
      id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4187',
      handle: 'acme',
      name: 'ACME Security',
      following: true,
      confidentialityLevel: { id: 3, value: 'public' },
      status: { id: 1, value: 'active' },
      type: { id: 1, value: 'web' },
      domains: {
        id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4188',
        createdAt: 1_700_000_000,
        content: [
          {
            id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4189',
            type: { id: 1, value: 'domain' },
            endpoint: '*.acme.com',
            tier: { id: 0, value: 'gold' },
            description: 'all subdomains',
            requiredSkills: [{ id: '1', name: 'web' }]
          }
        ]
      },
      rulesOfEngagement: {
        id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4190',
        createdAt: 1_700_000_000,
        content: {
          description: 'Do not test bravo domains.',
          testingRequirements: {
            intigritiMe: true,
            automatedTooling: 10,
            userAgent: null,
            requestHeader: 'X-Custom: 1'
          },
          safeHarbour: true
        },
        attachments: []
      },
      webLinks: { detail: 'https://intigriti.com/programs/acme' },
      industry: null
    }
    const result = programDetailSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.domains.content?.[0]?.endpoint).toBe('*.acme.com')
      expect(result.data.rulesOfEngagement?.content?.safeHarbour).toBe(true)
    }
  })

  it('valide la réponse domains/{versionId}', () => {
    const payload = {
      domains: {
        id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4188',
        createdAt: 1_700_000_000,
        content: [
          {
            id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4189',
            type: { id: 1, value: 'domain' },
            endpoint: '*.acme.com',
            tier: { id: 0, value: 'gold' },
            description: '',
            requiredSkills: []
          }
        ]
      }
    }
    expect(programDomainsSchema.safeParse(payload).success).toBe(true)
  })

  it('valide la réponse rules-of-engagements/{versionId}', () => {
    const payload = {
      rulesOfEngagement: {
        id: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4190',
        createdAt: 1_700_000_000,
        content: null,
        attachments: [{ url: 'https://cdn.example.com/roe.pdf', code: 200 }]
      }
    }
    expect(programRulesSchema.safeParse(payload).success).toBe(true)
  })

  it('accepte une activité de programme (objet activity polymorphe)', () => {
    const payload = {
      maxCount: 2,
      records: [
        {
          programId: 'c3b8ef0e-4aa4-4c79-b8cb-b7b91edb4187',
          activity: { type: 'scopeChanged', oldScope: [], newScope: [{}] },
          type: { id: 1, value: 'scope' },
          createdAt: 1_700_000_000,
          following: true
        }
      ]
    }
    expect(programActivityPageSchema.safeParse(payload).success).toBe(true)
  })
})