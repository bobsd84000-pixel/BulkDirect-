/**
 * Lead Scorer
 * Scores lead quality based on heuristics and extracted entities
 */

class LeadScorer {
  constructor(config = {}) {
    this.config = {
      qualityThreshold: config.qualityThreshold || 0.4,
      enableDetailedScoring: config.enableDetailedScoring || false,
      ...config
    };

    // Scoring weights
    this.weights = {
      hasCompany: 0.25,
      hasDecisionMaker: 0.20,
      hasPainPoint: 0.20,
      hasBudgetSignal: 0.15,
      hasContactInfo: 0.10,
      companySize: 0.10
    };
  }

  /**
   * Score a lead based on entities and context
   */
  scoreLead(entities, post = {}, comments = []) {
    const scores = {
      company: this.scoreCompany(entities),
      decisionMaker: this.scoreDecisionMaker(entities),
      painPoint: this.scorePainPoint(entities),
      budget: this.scoreBudget(entities),
      contact: this.scoreContact(entities, comments),
      engagement: this.scoreEngagement(post)
    };

    const totalScore = this.calculateTotal(scores);

    return {
      totalScore,
      confidence: this.calculateConfidence(entities, post),
      tier: this.determineTier(totalScore),
      scores,
      isQualified: totalScore >= this.config.qualityThreshold,
      reasoning: this.generateReasoning(scores, entities)
    };
  }

  /**
   * Score company presence (0-1)
   */
  scoreCompany(entities) {
    const { companies = [] } = entities;

    if (companies.length === 0) return 0;
    if (companies.length >= 2) return 1.0; // Multiple companies mentioned
    return 0.8; // Single company mentioned
  }

  /**
   * Score decision maker signals (0-1)
   */
  scoreDecisionMaker(entities) {
    const { titles = [] } = entities;

    if (titles.length === 0) return 0;
    if (titles.length >= 2) return 1.0;

    // Check if title is founder/CEO (stronger signal)
    const executiveTitles = ['founder', 'CEO', 'CTO', 'CRO', 'VP'];
    const hasExecutive = titles.some(t =>
      executiveTitles.some(e => t.toLowerCase().includes(e.toLowerCase()))
    );

    return hasExecutive ? 0.9 : 0.6;
  }

  /**
   * Score pain point indicators (0-1)
   */
  scorePainPoint(entities) {
    const { painPoints = [] } = entities;

    if (painPoints.length === 0) return 0;
    if (painPoints.length >= 3) return 1.0;
    if (painPoints.length >= 2) return 0.8;
    return 0.5;
  }

  /**
   * Score budget/commercial signals (0-1)
   */
  scoreBudget(entities) {
    const { budgetSignals = [] } = entities;

    if (budgetSignals.length === 0) return 0;

    // Check for high-value signals
    const highValueSignals = ['funding', 'Series', 'budget', 'enterprise'];
    const hasHighValue = budgetSignals.some(s =>
      highValueSignals.some(h => s.toLowerCase().includes(h.toLowerCase()))
    );

    if (hasHighValue) return 1.0;
    if (budgetSignals.length >= 2) return 0.7;
    return 0.4;
  }

  /**
   * Score contact information presence (0-1)
   */
  scoreContact(entities, comments = []) {
    const { emails = [] } = entities;

    let contactScore = 0;

    // Direct email
    if (emails.length > 0) {
      contactScore += 0.6;
    }

    // Check post/comments for contact hints (Reddit usernames, "DM me", etc)
    const allText = comments.map(c => c.body).join(' ');
    if (/dm\s+(me|us|for)|contact\s+(me|us)/i.test(allText)) {
      contactScore += 0.4;
    }

    return Math.min(contactScore, 1.0);
  }

  /**
   * Score post engagement (0-1)
   */
  scoreEngagement(post = {}) {
    if (!post.score || !post.num_comments) return 0;

    const score = post.score || 0;
    const comments = post.num_comments || 0;

    // More engagement = higher quality (post gaining traction)
    if (score > 100 && comments > 20) return 1.0;
    if (score > 50 && comments > 10) return 0.8;
    if (score > 20 && comments > 5) return 0.6;
    if (score > 0 && comments > 0) return 0.4;

    return 0.2; // Low engagement, but not 0
  }

  /**
   * Calculate total weighted score
   */
  calculateTotal(scores) {
    const weighted = {
      company: scores.company * this.weights.hasCompany,
      decisionMaker: scores.decisionMaker * this.weights.hasDecisionMaker,
      painPoint: scores.painPoint * this.weights.hasPainPoint,
      budget: scores.budget * this.weights.hasBudgetSignal,
      contact: scores.contact * this.weights.hasContactInfo,
      engagement: scores.engagement * this.weights.companySize
    };

    const total = Object.values(weighted).reduce((sum, val) => sum + val, 0);
    return Math.round(total * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate confidence in score (0-1)
   */
  calculateConfidence(entities, post = {}) {
    let confidence = 0;

    // More entities = higher confidence
    const entityCount =
      (entities.companies?.length || 0) +
      (entities.tools?.length || 0) +
      (entities.titles?.length || 0) +
      (entities.painPoints?.length || 0) +
      (entities.budgetSignals?.length || 0);

    confidence = Math.min(entityCount / 10, 1.0) * 0.7; // Max 70% from entities

    // Engagement adds confidence
    const engagement = post.score || 0;
    confidence += Math.min(engagement / 1000, 1.0) * 0.3; // Max 30% from engagement

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Determine lead tier (1, 2, or 3)
   */
  determineTier(score) {
    if (score >= 0.85) return 1;
    if (score >= 0.60) return 2;
    if (score >= 0.40) return 3;
    return null; // Not qualified
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(scores, entities) {
    const reasons = [];

    if (scores.company > 0.5) {
      reasons.push(`Company mentioned: ${entities.companies?.length || 0} entities`);
    }

    if (scores.decisionMaker > 0.5) {
      reasons.push(`Decision maker signals: ${entities.titles?.join(', ')}`);
    }

    if (scores.painPoint > 0.5) {
      reasons.push(`Pain points identified: ${entities.painPoints?.join(', ')}`);
    }

    if (scores.budget > 0.5) {
      reasons.push(`Budget/funding signals: ${entities.budgetSignals?.join(', ')}`);
    }

    if (scores.contact > 0) {
      reasons.push('Contact information available');
    }

    return reasons.length > 0 ? reasons : ['Minimal qualifying signals'];
  }

  /**
   * Batch score multiple leads
   */
  scoreLeads(leads) {
    return leads.map(lead => this.scoreLead(lead.entities, lead.post, lead.comments));
  }

  /**
   * Filter qualified leads
   */
  filterQualified(scoredLeads) {
    return scoredLeads.filter(lead => lead.isQualified);
  }
}

module.exports = LeadScorer;
