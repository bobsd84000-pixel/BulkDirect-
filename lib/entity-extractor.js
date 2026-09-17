/**
 * Entity Extractor
 * Extracts company names, products, tools, and decision makers from text
 */

class EntityExtractor {
  constructor() {
    // Common SaaS/B2B tools and services
    this.commonTools = [
      'Stripe', 'Shopify', 'Slack', 'Salesforce', 'HubSpot', 'Intercom',
      'Mixpanel', 'Segment', 'Amplitude', 'Datadog', 'NewRelic', 'Firebase',
      'AWS', 'Azure', 'Google Cloud', 'Heroku', 'Vercel', 'Docker',
      'GitHub', 'GitLab', 'Jira', 'Confluence', 'Notion', 'Asana',
      'Monday.com', 'Airtable', 'Zapier', 'IFTTT', 'PagerDuty', 'OpsGenie',
      'Elastic', 'Kubernetes', 'Jenkins', 'CircleCI', 'Travis CI',
      'Figma', 'InVision', 'Sketch', 'Adobe XD', 'Webflow', 'Wix',
      'WordPress', 'Drupal', 'Magento', 'WooCommerce', 'BigCommerce',
      'Twilio', 'SendGrid', 'Mailgun', 'Plaid', 'Auth0', 'Okta',
      'Zendesk', 'Freshdesk', 'Help Scout', 'Gorgias', 'Tidio'
    ];

    // Decision maker titles
    this.decisionMakerTitles = [
      'founder', 'CEO', 'CTO', 'CRO', 'VP of sales', 'VP of engineering',
      'Head of', 'Director of', 'Manager of', 'Tech lead', 'Engineering lead',
      'Product manager', 'Growth manager', 'Marketing manager'
    ];

    // Pain point keywords
    this.painPointKeywords = [
      'struggling', 'problem', 'issue', 'challenge', 'pain point', 'stuck',
      'slow', 'expensive', 'difficult', 'hard to', 'need help', 'looking for',
      'help with', 'advice on', 'recommendation', 'suggestion', 'alternative',
      'switch from', 'move away from', 'budget constraint', 'scaling issue'
    ];

    // Budget indicators
    this.budgetIndicators = [
      'budget', 'pricing', 'cost', 'expensive', 'affordable', 'pricing tier',
      'annual contract', 'pay per', 'subscription', 'licensing', 'enterprise',
      'raise', 'funding', 'seed', 'Series A', 'Series B', 'backed'
    ];

    // Company size indicators
    this.companySizeKeywords = {
      early: ['bootstrapped', 'solo', 'founder', 'small team', 'MVP', 'pre-launch'],
      growth: ['scaling', 'hiring', 'expansion', 'growth stage', 'Series A', 'Series B'],
      mature: ['enterprise', 'large team', 'established', 'Series C', 'public', 'IPO']
    };
  }

  /**
   * Extract all entities from text
   */
  extractAll(text) {
    if (!text || typeof text !== 'string') {
      return { companies: [], tools: [], titles: [], painPoints: [], budgetSignals: [] };
    }

    return {
      companies: this.extractCompanies(text),
      tools: this.extractTools(text),
      titles: this.extractTitles(text),
      painPoints: this.extractPainPoints(text),
      budgetSignals: this.extractBudgetSignals(text),
      companySize: this.inferCompanySize(text)
    };
  }

  /**
   * Extract company names (capitalized phrases)
   */
  extractCompanies(text) {
    const companies = new Set();

    // Match capitalized words/phrases (likely company names)
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = text.match(capitalizedPattern) || [];

    matches.forEach(match => {
      // Filter out common words and known tools
      if (!this.isCommonWord(match) && !this.commonTools.includes(match)) {
        if (match.length > 2) {
          companies.add(match);
        }
      }
    });

    return Array.from(companies).slice(0, 10); // Limit to 10
  }

  /**
   * Extract known tools/services mentioned
   */
  extractTools(text) {
    const tools = new Set();
    const lowerText = text.toLowerCase();

    this.commonTools.forEach(tool => {
      if (lowerText.includes(tool.toLowerCase())) {
        tools.add(tool);
      }
    });

    return Array.from(tools);
  }

  /**
   * Extract decision maker titles
   */
  extractTitles(text) {
    const titles = new Set();
    const lowerText = text.toLowerCase();

    this.decisionMakerTitles.forEach(title => {
      if (lowerText.includes(title.toLowerCase())) {
        titles.add(title);
      }
    });

    return Array.from(titles);
  }

  /**
   * Extract pain point indicators
   */
  extractPainPoints(text) {
    const painPoints = new Set();
    const lowerText = text.toLowerCase();

    this.painPointKeywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        painPoints.add(keyword);
      }
    });

    return Array.from(painPoints);
  }

  /**
   * Extract budget/commercial signals
   */
  extractBudgetSignals(text) {
    const signals = new Set();
    const lowerText = text.toLowerCase();

    this.budgetIndicators.forEach(indicator => {
      if (lowerText.includes(indicator.toLowerCase())) {
        signals.add(indicator);
      }
    });

    return Array.from(signals);
  }

  /**
   * Infer company size from keywords
   */
  inferCompanySize(text) {
    const lowerText = text.toLowerCase();

    for (const [size, keywords] of Object.entries(this.companySizeKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return size;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Check if word is a common English word
   */
  isCommonWord(word) {
    const commonWords = [
      'The', 'This', 'That', 'These', 'Those', 'What', 'Where', 'When',
      'Why', 'How', 'Who', 'Which', 'Would', 'Could', 'Should', 'Have',
      'With', 'From', 'About', 'After', 'Being', 'Before', 'Between',
      'Just', 'Some', 'More', 'Most', 'Really', 'Very', 'Such', 'Only',
      'Same', 'Than', 'Then', 'Once', 'Also', 'All', 'Any', 'Both'
    ];

    return commonWords.includes(word);
  }

  /**
   * Extract email addresses
   */
  extractEmails(text) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailPattern) || [];
  }

  /**
   * Extract URLs
   */
  extractUrls(text) {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return text.match(urlPattern) || [];
  }
}

module.exports = EntityExtractor;
