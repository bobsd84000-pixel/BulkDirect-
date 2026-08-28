#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CSVExporter {
  constructor(options = {}) {
    this.columns = options.columns?.split(',') || null;
    this.filter = options.filter || null;
    this.output = options.output;
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
      }
      return this.data;
    } catch (error) {
      console.error('❌ Erreur chargement:', error.message);
      return [];
    }
  }

  /**
   * Filtre les données
   */
  applyFilter() {
    if (!this.filter) return this.data;

    const [field, value] = this.filter.split('=');
    return this.data.filter(item => item[field] === value);
  }

  /**
   * Sélectionne les colonnes
   */
  selectColumns(data) {
    if (!this.columns) {
      this.columns = data.length > 0 ? Object.keys(data[0]) : [];
    }
    return data.map(item =>
      this.columns.reduce((obj, col) => ({ ...obj, [col]: item[col] }), {})
    );
  }

  /**
   * Exporte en CSV
   */
  export(inputFile) {
    this.loadData(inputFile);
    let filtered = this.applyFilter();
    let selected = this.selectColumns(filtered);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = this.output || `./exports/products-${timestamp}.csv`;

    // Crée le dossier
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // CSV headers
    const headers = this.columns.join(',');
    const rows = selected.map(item =>
      this.columns.map(col => `"${item[col] || ''}"`).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    fs.writeFileSync(filename, csv);

    console.log(`✅ Export créé: ${filename}`);
    console.log(`📄 Lignes: ${selected.length}`);
    console.log(`💾 Taille: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)}MB`);

    return filename;
  }
}

/**
 * Parse les arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--columns' && args[i + 1]) {
      options.columns = args[++i];
    } else if (args[i] === '--filter' && args[i + 1]) {
      options.filter = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    }
  }

  return options;
}

/**
 * Main
 */
function main() {
  const options = parseArgs();
  const inputFile = './exports/products-bulk-latest.json';

  if (!fs.existsSync(inputFile)) {
    console.error('❌ Fichier source non trouvé');
    process.exit(1);
  }

  const exporter = new CSVExporter(options);
  exporter.export(inputFile);
}

if (require.main === module) {
  main();
}

module.exports = CSVExporter;
