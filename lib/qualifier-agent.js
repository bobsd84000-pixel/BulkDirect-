/**
 * Qualifier Agent
 * Validates and qualifies discovered leads with enrichment and readiness assessment
 */

const Agent = require('./agent-base');
const EnrichmentClient = require('./enrichment-client');
const CompanyEnricher = require('./company-enricher');
const BuyerReadinessAnalyzer = require('./buyer-readiness');

class QualifierAgent extends Agent {
  constructor(config = {}) {
    super(config);
    this.type = 'qualifier';
    this.description = 'Validates and qualifies discovered leads';

    // Initialize dependencies
    this.enrichmentClient = new EnrichmentClient(config.enrichment || {});
    this.companyEnricher = new CompanyEnricher(this.enrichmentClient);
    this.readinessAnalyzer = new BuyerReadinessAnalyzer({
      confidenceThreshold: config.confidenceThreshold || 0.6,
      ...config.readiness
    });

    // Qualifier-specific config
    this.qualityThreshold = config.qualityThreshold || 0.4;
    this.tieringRules = config.tieringRules || {
      tier1: 0.85,
      tier2: 0.60,
      tier3: 0.40
    };

    // State
    this.qualifiedLeads = [];
    this.rejectedLeads = [];

    this.logIfDebug('Qualifier Agent initialized', {
      qualityThreshold: this.qualityThreshold,
      tieringRules: this.tieringRules
    });
  }

  /**
   * Process a qualifier task
   */
  async process(message) {
    const { type, lead, leads } = message.payload || {};

    try {
      switch (type) {
        case 'qualify_lead':
          return await this.qualifyLead(lead);
        case 'qualify_batch':
          return await this.qualifyBatch(leads);
        case 'get_status':
          return this.getStatus();
        default:
          return { success: false, error: 'Unknown qualifier message type' };
      }
    } catch (error) {
      this.logIfDebug('Qualifier processing error', { error: error.message });
      throw error;
    }
  }

  /**
   * Qualify a single lead
   */
  async qualifyLead(lead) {
    if (!lead) {
      return { success: false, error: 'Lead required' };
    }

    try {
      this.logIfDebug('Qualifying lead', { postId: lead.postId });

      // Step 1: Extract entities
      const entities = lead.entities || {};

      // Step 2: Enrich company data
      const enriched = await this.companyEnricher.enrichLead(lead, entities);

      // Step 3: Assess buyer readiness
      const readiness = this.readinessAnalyzer.analyzeBuyer(enriched, entities);

      // Step 4: Calculate overall qualification score
      const qualified = this.calculateQualificationScore(lead, enriched, readiness);

      // Step 5: Determine tier
      const tier = this.determineTier(qualified.overallScore);

      const result = {
        postId: lead.postId,
        title: lead.title,
        author: lead.author,
        subreddit: lead.subreddit,
        originalScore: lead.leadScore,
        company: enriched.company,
        readiness,
        qualification: qualified,
        tier,
        isQualified: qualified.isQualified,
        nextStep: this.recommendNextStep(qualified, readiness, tier),
        qualifiedAt: new Date().toISOString()
      };

      if (result.isQualified) {
        this.qualifiedLeads.push(result);
      } else {
        this.rejectedLeads.push(result);
      }

      return {
        success: true,
        lead: result
      };
    } catch (error) {
      this.logIfDebug('Lead qualification error', { error: error.message });
      return {
        success: false,
        postId: lead.postId,
        error: error.message
      };
    }
  }

  /**
   * Qualify multiple leads (batch)
   */
  async qualifyBatch(leads) {
    if (!Array.isArray(leads)) {
      return { success: false, error: 'Leads must be an array' };
    }

    this.logIfDebug('Qualifying batch', { count: leads.length });

    const results = [];
    let qualified = 0;
    let rejected = 0;

    for (const lead of leads) {
      const result = await this.qualifyLead(lead);
      if (result.success) {
        results.push(result.lead);
        if (result.lead.isQualified) qualified++;
        else rejected++;
      }
    }

    return {
      success: true,
      total: leads.length,
      qualified,
      rejected,
      leads: results
    };
  }

  /**
   * Calculate overall qualification score
   */
  calculateQualificationScore(lead, enriched, readiness) {
    const scores = {
      leadScore: lead.leadScore || 0,
      companyMatch: this.scoreCompanyMatch(enriched),
      readinessScore: readiness.overallScore,
      enrichmentQuality: this.scoreEnrichmentQuality(enriched),
      bantCompletion: this.scoreBantCompletion(readiness)
    };

    // Weighted calculation
    const weights = {
      leadScore: 0.25,
      companyMatch: 0.20,
      readinessScore: 0.30,
      enrichmentQuality: 0.15,
      bantCompletion: 0.10
    };

    const overallScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      scores,
      weights,
      overallScore: Math.round(overallScore * 100) / 100,
      isQualified: overallScore >= this.qualityThreshold,
      reason: this.generateQualificationReason(scores, overallScore)
    };
  }

  /**
   * Score company information match
   */
  scoreCompanyMatch(enriched) {
    if (!enriched.company) return 0;

    let score = 0;

    if (enriched.company.domain) score += 0.3;
    if (enriched.company.name) score += 0.25;
    if (enriched.company.industry) score += 0.2;
    if (enriched.company.size) score += 0.15;
    if (enriched.company.funding) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Score enrichment data quality
   */
  scoreEnrichmentQuality(enriched) {
    if (!enriched.company.enrichedAt) return 0;

    const sourceCount = enriched.company.enrichmentSource?.split(',').length || 0;
    return Math.min(sourceCount * 0.3, 1.0);
  }

  /**
   * Score BANT completion
   */
  scoreBantCompletion(readiness) {
    const { bantScore } = readiness;

    switch (bantScore) {
      case 'complete':
        return 1.0;
      case 'partial':
        return 0.7;
      case 'emerging':
        return 0.4;
      case 'incomplete':
        return 0.1;
      default:
        return 0;
    }
  }

  /**
   * Determine lead tier based on score
   */
  determineTier(score) {
    if (score >= this.tieringRules.tier1) return 1;
    if (score >= this.tieringRules.tier2) return 2;
    if (score >= this.tieringRules.tier3) return 3;
    return null;
  }

  /**
   * Recommend next step
   */
  recommendNextStep(qualified, readiness, tier) {
    if (!qualified.isQualified) {
      return 'Not qualified - needs more signals';
    }

    if (tier === 1) {
      return 'High priority - Route to sales immediately';
    }

    if (tier === 2) {
      if (readiness.readinessLevel === 'high') {
        return 'Good fit - Route to sales for outreach';
      }
      return 'Potential fit - Nurture and follow up';
    }

    if (tier === 3) {
      if (readiness.readinessLevel === 'medium') {
        return 'Emerging lead - Add to nurture sequence';
      }
      return 'Early stage - Monitor for signals';
    }

    return 'Review manually';
  }

  /**
   * Generate qualification reason
   */
  generateQualificationReason(scores, overallScore) {
    const reasons = [];

    if (scores.leadScore > 0.6) {
      reasons.push('Strong initial lead signals');
    }

    if (scores.readinessScore > 0.7) {
      reasons.push('High buyer readiness');
    }

    if (scores.companyMatch > 0.7) {
      reasons.push('Well-enriched company data');
    }

    if (scores.bantCompletion > 0.6) {
      reasons.push('Strong BANT completion');
    }

    return reasons.length > 0 ? reasons : ['Marginal qualification - review manually'];
  }

  /**
   * Get qualifier status
   */
  getStatus() {
    const health = this.getHealth();

    return {
      success: true,
      agent: this.name,
      status: health.status,
      qualifiedLeads: this.qualifiedLeads.length,
      rejectedLeads: this.rejectedLeads.length,
      conversionRate: this.qualifiedLeads.length /
        (this.qualifiedLeads.length + this.rejectedLeads.length || 1),
      uptime: health.uptime,
      metrics: health.metrics
    };
  }

  /**
   * Get qualified leads by tier
   */
  getLeadsByTier(tier) {
    return this.qualifiedLeads.filter(lead => lead.tier === tier);
  }

  /**
   * Log if debug enabled
   */
  logIfDebug(message, data = {}) {
    if (this.config.logLevel === 'debug') {
      console.log(`[${this.name}] ${message}`, data);
    }
  }
}

module.exports = QualifierAgent;
