/**
 * Buyer Readiness Analyzer
 * Assesses buyer readiness using BANT framework (Budget, Authority, Need, Timeline)
 */

class BuyerReadinessAnalyzer {
  constructor(config = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold || 0.6,
      ...config
    };

    // Keywords for each readiness dimension
    this.keywords = {
      budget: {
        positive: ['funding', 'budget', 'allocate', 'invest', 'spend', 'revenue', 'Series', 'raise'],
        negative: ['no budget', 'broke', 'free', 'bootstrap', 'pennies']
      },
      authority: {
        titles: ['founder', 'CEO', 'CTO', 'VP', 'director', 'head', 'lead', 'manager'],
        hiring: ['hiring', 'hiring team', 'growing team', 'scaling team', 'expansion']
      },
      need: {
        urgent: ['struggling', 'pain', 'problem', 'urgent', 'critical', 'blocking', 'stuck'],
        scaling: ['scaling', 'growth', 'expanding', 'growing', 'performance', 'optimization'],
        replacement: ['switch', 'migrate', 'alternative', 'replace', 'leave']
      },
      timeline: {
        immediate: ['ASAP', 'immediately', 'urgent', 'now', 'today', 'this week'],
        shortterm: ['month', 'soon', 'coming', 'planning'],
        exploring: ['exploring', 'researching', 'considering', 'looking at']
      }
    };
  }

  /**
   * Analyze buyer readiness
   */
  analyzeBuyer(lead, entities = {}) {
    const readiness = {
      budget: this.assessBudget(lead, entities),
      authority: this.assessAuthority(lead, entities),
      need: this.assessNeed(lead, entities),
      timeline: this.assessTimeline(lead, entities),
      overallScore: 0,
      readinessLevel: null,
      bantScore: null
    };

    // Calculate overall BANT score
    readiness.overallScore = (
      readiness.budget.score +
      readiness.authority.score +
      readiness.need.score +
      readiness.timeline.score
    ) / 4;

    // Determine readiness level
    readiness.readinessLevel = this.determineReadinessLevel(readiness);

    // Calculate BANT composite score
    readiness.bantScore = this.calculateBantScore(readiness);

    return readiness;
  }

  /**
   * Assess budget dimension
   */
  assessBudget(lead, entities) {
    const text = `${lead.title || ''} ${lead.selftext || ''}`.toLowerCase();
    const score = { score: 0, signals: [], confidence: 0 };

    // Check budget signals in entities
    if (entities.budgetSignals && entities.budgetSignals.length > 0) {
      score.score = Math.min(0.5 + (entities.budgetSignals.length * 0.1), 1.0);
      score.signals = entities.budgetSignals;
    }

    // Check for funding/investment language
    const fundingKeywords = this.keywords.budget.positive;
    let fundingCount = 0;
    fundingKeywords.forEach(kw => {
      if (text.includes(kw)) {
        fundingCount++;
      }
    });

    if (fundingCount > 0) {
      score.score = Math.min(score.score + (fundingCount * 0.15), 1.0);
      score.signals.push('Funding/investment signals detected');
    }

    // Penalize for no budget
    this.keywords.budget.negative.forEach(kw => {
      if (text.includes(kw)) {
        score.score = Math.max(score.score - 0.3, 0);
        score.signals.push(`Negative signal: ${kw}`);
      }
    });

    score.confidence = Math.min(score.signals.length / 3, 1.0);
    return score;
  }

  /**
   * Assess authority dimension (decision maker signals)
   */
  assessAuthority(lead, entities) {
    const text = `${lead.title || ''} ${lead.selftext || ''}`.toLowerCase();
    const score = { score: 0, signals: [], confidence: 0 };

    // Check titles
    if (entities.titles && entities.titles.length > 0) {
      const executiveTitles = ['founder', 'CEO', 'CTO', 'VP', 'director'];
      let execCount = 0;

      entities.titles.forEach(title => {
        const lowerTitle = title.toLowerCase();
        if (executiveTitles.some(e => lowerTitle.includes(e))) {
          execCount++;
          score.signals.push(`Decision maker: ${title}`);
        }
      });

      score.score = Math.min(execCount * 0.4, 1.0);
    }

    // Check for team/hiring signals
    if (text.includes('team') || text.includes('hiring') || text.includes('expansion')) {
      score.score = Math.min(score.score + 0.3, 1.0);
      score.signals.push('Team/hiring signals detected');
    }

    score.confidence = Math.min(score.signals.length / 2, 1.0);
    return score;
  }

  /**
   * Assess need dimension
   */
  assessNeed(lead, entities) {
    const text = `${lead.title || ''} ${lead.selftext || ''}`.toLowerCase();
    const score = { score: 0, signals: [], confidence: 0 };

    // Check pain points
    if (entities.painPoints && entities.painPoints.length > 0) {
      score.score = Math.min(entities.painPoints.length * 0.25, 1.0);
      score.signals = entities.painPoints.map(p => `Pain point: ${p}`);
    }

    // Check urgency language
    let urgencyLevel = 0;
    this.keywords.need.urgent.forEach(kw => {
      if (text.includes(kw)) {
        urgencyLevel++;
      }
    });

    if (urgencyLevel > 0) {
      score.score = Math.min(score.score + (urgencyLevel * 0.15), 1.0);
      score.signals.push(`High urgency (${urgencyLevel} signals)`);
    }

    // Check scaling/growth language
    this.keywords.need.scaling.forEach(kw => {
      if (text.includes(kw)) {
        score.score = Math.min(score.score + 0.1, 1.0);
      }
    });

    score.confidence = Math.min(score.signals.length / 2, 1.0);
    return score;
  }

  /**
   * Assess timeline dimension
   */
  assessTimeline(lead, entities) {
    const text = `${lead.title || ''} ${lead.selftext || ''}`.toLowerCase();
    const score = { score: 0, signals: [], confidence: 0 };

    // Check immediate timeline
    let immediateCount = 0;
    this.keywords.timeline.immediate.forEach(kw => {
      if (text.includes(kw)) {
        immediateCount++;
        score.signals.push(`Immediate signal: ${kw}`);
      }
    });

    if (immediateCount > 0) {
      score.score = Math.min(immediateCount * 0.35, 1.0);
    }

    // Check short-term timeline
    if (!immediateCount) {
      let shorttermCount = 0;
      this.keywords.timeline.shortterm.forEach(kw => {
        if (text.includes(kw)) {
          shorttermCount++;
        }
      });

      if (shorttermCount > 0) {
        score.score = Math.min(shorttermCount * 0.2, 0.7);
        score.signals.push(`Short-term signals: ${shorttermCount}`);
      }
    }

    // Check if just exploring
    let exploringCount = 0;
    this.keywords.timeline.exploring.forEach(kw => {
      if (text.includes(kw)) {
        exploringCount++;
      }
    });

    if (exploringCount > 0 && immediateCount === 0) {
      score.score = Math.min(score.score + 0.2, 0.5);
      score.signals.push('Exploring/researching phase');
    }

    score.confidence = Math.min(score.signals.length / 2, 1.0);
    return score;
  }

  /**
   * Determine overall readiness level
   */
  determineReadinessLevel(readiness) {
    const { budget, authority, need, timeline } = readiness;

    // All dimensions strong
    if (budget.score > 0.7 && authority.score > 0.7 && need.score > 0.8 && timeline.score > 0.6) {
      return 'high';
    }

    // Most dimensions present
    const strongDimensions = [
      budget.score > 0.5,
      authority.score > 0.5,
      need.score > 0.6,
      timeline.score > 0.4
    ].filter(Boolean).length;

    if (strongDimensions >= 3) {
      return 'medium';
    }

    if (strongDimensions >= 2) {
      return 'low';
    }

    return 'not-ready';
  }

  /**
   * Calculate composite BANT score
   */
  calculateBantScore(readiness) {
    // BANT: all 4 must be present for sales-ready
    const allPresent =
      readiness.budget.score > 0 &&
      readiness.authority.score > 0 &&
      readiness.need.score > 0 &&
      readiness.timeline.score > 0;

    if (allPresent) {
      return 'complete';
    }

    // Partial BANT
    const presentCount = [
      readiness.budget.score > 0,
      readiness.authority.score > 0,
      readiness.need.score > 0,
      readiness.timeline.score > 0
    ].filter(Boolean).length;

    if (presentCount >= 3) return 'partial';
    if (presentCount >= 2) return 'emerging';
    return 'incomplete';
  }

  /**
   * Generate readiness insights
   */
  generateInsights(readiness) {
    const insights = [];

    if (readiness.budget.score < 0.3) {
      insights.push('⚠️ Budget not confirmed - may need budget discussion');
    }

    if (readiness.authority.score < 0.3) {
      insights.push('⚠️ Decision maker not identified - may need stakeholder mapping');
    }

    if (readiness.need.score < 0.5) {
      insights.push('⚠️ Pain points not clear - may need needs analysis');
    }

    if (readiness.timeline.score < 0.3) {
      insights.push('⚠️ No urgency detected - may be exploratory');
    }

    if (readiness.overallScore > 0.7) {
      insights.push('✓ Strong buying signals - recommend sales engagement');
    }

    return insights;
  }

  /**
   * Batch analyze multiple leads
   */
  analyzeLeads(leads, entitiesArray = []) {
    return leads.map((lead, i) =>
      this.analyzeBuyer(lead, entitiesArray[i] || {})
    );
  }
}

module.exports = BuyerReadinessAnalyzer;
