#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DataAnalyzer {
  constructor(options = {}) {
    this.file = options.file;
    this.format = options.format || 'text';
    this.data = [];
  }

  /**
   * Charge les données
   */
  loadData(filePath) {
    try {
      const ext = path.extname(filePath);
      if (ext === '.json') {
        this.data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } else if (ext === '.csv') {
        // Parser CSV simple
        const csv = fs.readFileSync(filePath, 'utf-8');
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        this.data = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] }), {});
        });
      }
      return this.data;
    } catch (error) {
      console.error('❌ Erreur chargement:', error.message);
      return [];
    }
  }

  /**
   * Analyse les données
   */
  analyze() {
    if (this.data.length === 0) {
      console.error('❌ Aucune donnée à analyser');
      return null;
    }

    const stats = {
      total: this.data.length,
      categories: this.countCategories(),
      avgDescriptionLength: this.calculateAvgLength(),
      completeness: this.calculateCompleteness(),
      anomalies: this.detectAnomalies()
    };

    return stats;
  }

  /**
   * Compte les catégories
   */
  countCategories() {
    const categories = new Set();
    this.data.forEach(item => {
      if (item.category) categories.add(item.category);
    });
    return categories.size;
  }

  /**
   * Calcule la longueur moyenne
   */
  calculateAvgLength() {
    const total = this.data.reduce((sum, item) => {
      return sum + (item.description?.length || 0);
    }, 0);
    return Math.round(total / this.data.length);
  }

  /**
   * Calcule le taux de complétude
   */
  calculateCompleteness() {
    const complete = this.data.filter(item =>
      item.name && item.description && item.category
    ).length;
    return Math.round((complete / this.data.length) * 100);
  }

  /**
   * Détecte les anomalies
   */
  detectAnomalies() {
    const anomalies = [];

    this.data.forEach((item, idx) => {
      if (!item.name) anomalies.push(`Ligne ${idx}: nom manquant`);
      if (!item.description) anomalies.push(`Ligne ${idx}: description manquante`);
      if (item.description?.length < 10) anomalies.push(`Ligne ${idx}: description trop courte`);
    });

    return anomalies.slice(0, 10); // Max 10 anomalies
  }

  /**
   * Formatte le rapport
   */
  formatReport(stats) {
    if (this.format === 'json') {
      return JSON.stringify(stats, null, 2);
    }

    return `
📈 Rapport d'Analyse
${'═'.repeat(50)}
✅ Total produits: ${stats.total.toLocaleString()}
📊 Catégories: ${stats.categories}
💬 Longueur description moyenne: ${stats.avgDescriptionLength} caractères
✨ Taux de complétude: ${stats.completeness}%
🚨 Anomalies détectées: ${stats.anomalies.length}
${stats.anomalies.length > 0 ? '\nPremières anomalies:\n' + stats.anomalies.slice(0, 3).map(a => `  • ${a}`).join('\n') : ''}
${'═'.repeat(50)}
`;
  }
}

/**
 * Parse les arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      options.file = args[++i];
    } else if (args[i] === '--format' && args[i + 1]) {
      options.format = args[++i];
    }
  }

  return options;
}

/**
 * Main
 */
async function main() {
  const options = parseArgs();

  // Si pas de fichier, utilise la dernière export
  if (!options.file) {
    const exportsDir = './exports';
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir).sort().reverse();
      options.file = path.join(exportsDir, files[0]);
    }
  }

  if (!options.file) {
    console.error('❌ Aucun fichier trouvé. Spécifiez --file PATH');
    process.exit(1);
  }

  const analyzer = new DataAnalyzer(options);
  analyzer.loadData(options.file);
  const stats = analyzer.analyze();

  if (stats) {
    console.log(analyzer.formatReport(stats));
  }
}

if (require.main === module) {
  main();
}

module.exports = DataAnalyzer;
