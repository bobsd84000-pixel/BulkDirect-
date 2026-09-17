/**
 * Company Enricher
 * Enriches company data from discovered leads
 */

class CompanyEnricher {
  constructor(enrichmentClient = null) {
    this.enrichmentClient = enrichmentClient;
  }

  /**
   * Extract domain from text (URLs, email domains, etc)
   */
  extractDomain(text, entities = {}) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Try to extract from URLs first
    const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const urlMatch = text.match(urlPattern);
    if (urlMatch) {
      return this.cleanDomain(urlMatch[1]);
    }

    // Try email domain
    const emailPattern = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = text.match(emailPattern);
    if (emailMatch) {
      return this.cleanDomain(emailMatch[1]);
    }

    // Try known company domains
    if (entities.companies && entities.companies.length > 0) {
      return this.companyNameToDomain(entities.companies[0]);
    }

    return null;
  }

  /**
   * Clean domain (remove www, normalize)
   */
  cleanDomain(domain) {
    return domain
      .replace(/^www\./, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Convert company name to likely domain
   */
  companyNameToDomain(companyName) {
    if (!companyName) return null;

    return companyName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .concat('.com');
  }

  /**
   * Enrich lead with company data
   */
  async enrichLead(lead, entities = {}) {
    const enriched = {
      ...lead,
      company: {
        domain: null,
        name: null,
        industry: null,
        size: null,
        funding: null,
        technologies: [],
        enrichmentSource: null,
        enrichedAt: null
      }
    };

    // Extract domain
    const domain = this.extractDomain(lead.title || '', entities);
    if (!domain) {
      return enriched;
    }

    enriched.company.domain = domain;

    // Enrich via API if available
    if (this.enrichmentClient) {
      try {
        const result = await this.enrichmentClient.enrichCompany(
          domain,
          entities.companies?.[0] || null
        );

        if (result.success && result.merged) {
          enriched.company.name = result.merged.name;
          enriched.company.industry = result.merged.industry;
          enriched.company.size = this.categorizeSize(result.merged.employees);
          enriched.company.funding = this.extractFundingStage(result.merged);
          enriched.company.technologies = result.merged.webTechnologies || [];
          enriched.company.enrichmentSource = Object.keys(result.sources).join(',');
          enriched.company.enrichedAt = new Date().toISOString();
        }
      } catch (error) {
        // Enrichment failed, continue with partial data
      }
    }

    return enriched;
  }

  /**
   * Categorize company size
   */
  categorizeSize(employees) {
    if (!employees) return 'unknown';
    if (employees <= 10) return '1-10';
    if (employees <= 50) return '11-50';
    if (employees <= 200) return '51-200';
    if (employees <= 500) return '201-500';
    if (employees <= 1000) return '501-1000';
    return '1000+';
  }

  /**
   * Extract funding stage from enrichment data
   */
  extractFundingStage(data) {
    if (!data) return null;

    // Check for explicit funding stage
    if (data.fundingStage) {
      return data.fundingStage.toLowerCase();
    }

    // Infer from funding amount
    if (data.annualRevenue) {
      if (data.annualRevenue > 100000000) return 'series-c+';
      if (data.annualRevenue > 10000000) return 'series-b';
      if (data.annualRevenue > 1000000) return 'series-a';
      return 'seed';
    }

    return null;
  }

  /**
   * Batch enrich multiple leads
   */
  async enrichLeads(leads, entitiesArray = []) {
    const results = [];

    for (let i = 0; i < leads.length; i++) {
      const enriched = await this.enrichLead(leads[i], entitiesArray[i] || {});
      results.push(enriched);
    }

    return results;
  }

  /**
   * Validate enriched data
   */
  validateEnrichedData(enriched) {
    const issues = [];

    if (!enriched.company.domain) {
      issues.push('Missing domain');
    }

    if (!enriched.company.name && enriched.company.domain) {
      issues.push('Company name not found');
    }

    if (!enriched.company.industry) {
      issues.push('Industry not identified');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = CompanyEnricher;
