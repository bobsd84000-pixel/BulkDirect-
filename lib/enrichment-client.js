/**
 * Enrichment Client
 * Fetches company data from third-party enrichment APIs
 */

const https = require('https');

class EnrichmentClient {
  constructor(config = {}) {
    this.config = {
      clearbit: { apiKey: config.clearbit?.apiKey, enabled: config.clearbit?.enabled !== false },
      hunter: { apiKey: config.hunter?.apiKey, enabled: config.hunter?.enabled !== false },
      apollo: { apiKey: config.apollo?.apiKey, enabled: config.apollo?.enabled !== false },
      timeout: config.timeout || 10000,
      ...config
    };

    this.cache = new Map();
  }

  /**
   * Enrich company by domain or name
   */
  async enrichCompany(domain, companyName = null) {
    if (!domain) {
      return { success: false, error: 'Domain required' };
    }

    // Check cache first
    const cacheKey = `company:${domain}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const enriched = {
      domain,
      companyName: companyName || null,
      sources: {},
      merged: {}
    };

    // Try Clearbit first (most comprehensive)
    if (this.config.clearbit.enabled && this.config.clearbit.apiKey) {
      try {
        const clearbitData = await this.getClearbitCompany(domain);
        enriched.sources.clearbit = clearbitData;
        Object.assign(enriched.merged, clearbitData);
      } catch (error) {
        // Silently continue to next provider
      }
    }

    // Try Hunter for email patterns
    if (this.config.hunter.enabled && this.config.hunter.apiKey) {
      try {
        const hunterData = await this.getHunterData(domain);
        enriched.sources.hunter = hunterData;
        if (hunterData.emailPattern) {
          enriched.merged.emailPattern = hunterData.emailPattern;
        }
      } catch (error) {
        // Silently continue
      }
    }

    // Try Apollo for company profile
    if (this.config.apollo.enabled && this.config.apollo.apiKey) {
      try {
        const apolloData = await this.getApolloCompany(domain, companyName);
        enriched.sources.apollo = apolloData;
        if (apolloData.employees) {
          enriched.merged.employees = apolloData.employees;
        }
      } catch (error) {
        // Silently continue
      }
    }

    enriched.success = Object.keys(enriched.sources).length > 0;
    this.cache.set(cacheKey, enriched);

    return enriched;
  }

  /**
   * Get company data from Clearbit
   */
  async getClearbitCompany(domain) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.clearbit.com',
        path: `/v1/companies/find?domain=${encodeURIComponent(domain)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.clearbit.apiKey}`,
          'User-Agent': 'Agent-Scout-Reddit/1.0'
        },
        timeout: this.config.timeout
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve({
                name: json.name,
                domain: json.domain,
                industry: json.category?.industry,
                subIndustry: json.category?.subIndustry,
                employees: json.metrics?.employees,
                employeesRange: json.metrics?.employeesRange,
                annualRevenue: json.metrics?.annualRevenue,
                funding: json.foundedYear,
                location: json.location,
                logoUrl: json.logo,
                description: json.description
              });
            } catch (e) {
              reject(new Error('Invalid Clearbit response'));
            }
          } else if (res.statusCode === 404) {
            reject(new Error('Company not found'));
          } else {
            reject(new Error(`Clearbit error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Clearbit timeout'));
      });
      req.end();
    });
  }

  /**
   * Get email pattern from Hunter
   */
  async getHunterData(domain) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.hunter.io',
        path: `/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=1`,
        method: 'GET',
        headers: {
          'User-Agent': 'Agent-Scout-Reddit/1.0'
        },
        timeout: this.config.timeout
      };

      // Add API key if available
      if (this.config.hunter.apiKey) {
        options.path += `&access_token=${this.config.hunter.apiKey}`;
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve({
                companySize: json.data?.company_size,
                emailPattern: json.data?.pattern,
                emails: json.data?.emails?.map(e => e.value) || [],
                country: json.data?.country,
                webTechnologies: json.data?.technologies || []
              });
            } catch (e) {
              reject(new Error('Invalid Hunter response'));
            }
          } else {
            reject(new Error(`Hunter error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Hunter timeout'));
      });
      req.end();
    });
  }

  /**
   * Get company profile from Apollo
   */
  async getApolloCompany(domain, companyName) {
    return new Promise((resolve, reject) => {
      const searchQuery = companyName || domain;

      const options = {
        hostname: 'api.apollo.io',
        path: `/v1/companies/search?q=${encodeURIComponent(searchQuery)}&api_key=${this.config.apollo.apiKey}`,
        method: 'GET',
        timeout: this.config.timeout
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              const company = json.companies?.[0];
              resolve({
                apolloId: company?.id,
                name: company?.name,
                employees: company?.employee_count,
                industry: company?.industry,
                growth: company?.growth_rate,
                technologies: company?.tech_stack || [],
                lastFunding: company?.latest_funding_date,
                fundingStage: company?.funding_stage
              });
            } catch (e) {
              reject(new Error('Invalid Apollo response'));
            }
          } else {
            reject(new Error(`Apollo error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Apollo timeout'));
      });
      req.end();
    });
  }

  /**
   * Find decision makers at company
   */
  async findDecisionMakers(domain, title = null) {
    if (!this.config.apollo.enabled || !this.config.apollo.apiKey) {
      return { success: false, error: 'Apollo not enabled' };
    }

    try {
      // In a real implementation, this would call Apollo's people search
      // For now, return a template structure
      return {
        success: true,
        domain,
        title,
        contacts: []
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear cache (optional)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

module.exports = EnrichmentClient;
