/**
 * Provider Matcher
 * Matches qualified leads with appropriate service providers
 */

class ProviderMatcher {
  constructor(providers = []) {
    this.providers = providers;
    this.matchHistory = [];
  }

  /**
   * Find best matching providers for a lead
   */
  findMatches(lead, topN = 3) {
    if (!lead || !lead.company) {
      return { matches: [], reason: 'Invalid lead or missing company data' };
    }

    const matches = [];

    for (const provider of this.providers) {
      const score = this.calculateMatchScore(lead, provider);

      if (score.totalScore > 0) {
        matches.push({
          provider: provider.id,
          name: provider.name,
          totalScore: score.totalScore,
          scores: score.scores,
          reasoning: score.reasoning
        });
      }
    }

    // Sort by score and return top N
    matches.sort((a, b) => b.totalScore - a.totalScore);

    return {
      matches: matches.slice(0, topN),
      totalMatches: matches.length,
      topMatch: matches[0] || null
    };
  }

  /**
   * Calculate match score between lead and provider
   */
  calculateMatchScore(lead, provider) {
    const scores = {
      industryMatch: this.scoreIndustryMatch(lead, provider),
      stageMatch: this.scoreStageMatch(lead, provider),
      tierMatch: this.scoreTierMatch(lead, provider),
      capabilityMatch: this.scoreCapabilityMatch(lead, provider)
    };

    // Weights
    const weights = {
      industryMatch: 0.35,
      stageMatch: 0.25,
      tierMatch: 0.25,
      capabilityMatch: 0.15
    };

    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      scores,
      weights,
      reasoning: this.generateMatchReasoning(scores, lead, provider)
    };
  }

  /**
   * Score industry match
   */
  scoreIndustryMatch(lead, provider) {
    if (!provider.industries || !lead.company.industry) {
      return 0;
    }

    const leadIndustry = lead.company.industry.toLowerCase();
    const matchCount = provider.industries.filter(ind =>
      ind.toLowerCase().includes(leadIndustry) ||
      leadIndustry.includes(ind.toLowerCase())
    ).length;

    if (matchCount > 0) return 1.0;
    if (provider.industries.length === 0) return 0.5; // Provider accepts all industries
    return 0;
  }

  /**
   * Score company stage match
   */
  scoreStageMatch(lead, provider) {
    if (!provider.stages) {
      return 0.5; // Provider not specific about stage
    }

    const leadStage = this.inferStage(lead);
    const matchCount = provider.stages.filter(stage =>
      stage.toLowerCase() === leadStage
    ).length;

    if (matchCount > 0) return 1.0;
    return 0;
  }

  /**
   * Score lead tier match
   */
  scoreTierMatch(lead, provider) {
    if (!provider.tiers || !lead.tier) {
      return 0.5; // No tier filtering
    }

    if (provider.tiers.includes(lead.tier)) {
      return 1.0;
    }

    // Partial match: accept higher tiers for lower-tier providers
    if (lead.tier < Math.min(...provider.tiers)) {
      return 0.6;
    }

    return 0;
  }

  /**
   * Score capability match (based on technologies, specialization)
   */
  scoreCapabilityMatch(lead, provider) {
    if (!provider.specialization) {
      return 0.5;
    }

    const specialization = provider.specialization.toLowerCase();
    const technologies = (lead.company.technologies || []).map(t => t.toLowerCase());

    let score = 0;

    // Check if provider specializes in relevant area
    if (technologies.some(t => specialization.includes(t))) {
      score += 0.7;
    }

    // Check industry/stage keywords
    if (specialization.includes('SaaS') && lead.company.industry?.includes('SaaS')) {
      score += 0.3;
    }

    if (specialization.includes('startup') && lead.company.size === '1-10') {
      score += 0.3;
    }

    if (specialization.includes('enterprise') && lead.company.size === '1000+') {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Infer company stage from enriched data
   */
  inferStage(lead) {
    if (!lead.company) return 'unknown';

    // Check funding stage
    const funding = lead.company.funding?.toLowerCase();
    if (funding?.includes('seed')) return 'early';
    if (funding?.includes('series-a') || funding?.includes('series-b')) return 'growth';
    if (funding?.includes('series-c') || funding?.includes('series-d')) return 'mature';

    // Check company size
    const size = lead.company.size;
    if (size === '1-10' || size === '11-50') return 'early';
    if (size === '51-200' || size === '201-500') return 'growth';
    if (size === '501-1000' || size === '1000+') return 'mature';

    return 'unknown';
  }

  /**
   * Generate match reasoning
   */
  generateMatchReasoning(scores, lead, provider) {
    const reasons = [];

    if (scores.industryMatch > 0.7) {
      reasons.push(`Industry match: ${lead.company.industry}`);
    }

    if (scores.stageMatch > 0.7) {
      reasons.push(`Stage match: ${this.inferStage(lead)}`);
    }

    if (scores.tierMatch > 0.7) {
      reasons.push(`Tier match: Tier ${lead.tier}`);
    }

    if (scores.capabilityMatch > 0.5) {
      reasons.push(`Capability match: ${provider.specialization}`);
    }

    return reasons.length > 0 ? reasons : ['Generic match available'];
  }

  /**
   * Add provider
   */
  addProvider(provider) {
    this.providers.push(provider);
  }

  /**
   * Update provider
   */
  updateProvider(providerId, updates) {
    const index = this.providers.findIndex(p => p.id === providerId);
    if (index !== -1) {
      this.providers[index] = { ...this.providers[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId) {
    return this.providers.find(p => p.id === providerId);
  }

  /**
   * Get all providers
   */
  getAllProviders() {
    return this.providers;
  }

  /**
   * Get match statistics
   */
  getStats() {
    return {
      totalProviders: this.providers.length,
      totalMatches: this.matchHistory.length,
      matchesByProvider: this.getMatchesByProvider()
    };
  }

  /**
   * Count matches by provider
   */
  getMatchesByProvider() {
    const counts = {};

    this.matchHistory.forEach(match => {
      counts[match.providerId] = (counts[match.providerId] || 0) + 1;
    });

    return counts;
  }

  /**
   * Record a match (for analytics)
   */
  recordMatch(leadId, providerId, score) {
    this.matchHistory.push({
      leadId,
      providerId,
      score,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ProviderMatcher;
