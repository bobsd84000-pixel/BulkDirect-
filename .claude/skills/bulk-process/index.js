#!/usr/bin/env node

/**
 * BulkDirect Batch Processor Skill
 * Lance le traitement batch des produits
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DEFAULTS = {
  batchSize: 10,
  startIndex: 0,
  apiEndpoint: '/api/describe-products'
};

class BulkProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || DEFAULTS.batchSize;
    this.startIndex = options.startIndex || DEFAULTS.startIndex;
    this.products = [];
    this.results = [];
    this.errors = [];
  }

  /**
   * Charge les produits du CSV
   */
  async loadProducts(filePath) {
    try {
      const csv = fs.readFileSync(filePath, 'utf-8');
      const records = parse(csv, { columns: true });
      this.products = records;
      console.log(`✅ ${this.products.length} produits chargés`);
      return this.products;
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error.message);
      throw error;
    }
  }

  /**
   * Traite les produits par batch
   */
  async processBatches() {
    const totalProducts = this.products.length;
    const endIndex = Math.min(totalProducts, this.startIndex + 1000);
    const batchesToProcess = this.products.slice(this.startIndex, endIndex);

    console.log(`\n🔄 Traitement de ${batchesToProcess.length} produits...`);
    console.log(`📊 Taille batch: ${this.batchSize}\n`);

    for (let i = 0; i < batchesToProcess.length; i += this.batchSize) {
      const batch = batchesToProcess.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const progress = Math.round((i / batchesToProcess.length) * 100);

      try {
        console.log(`[${progress}%] Batch ${batchNum}: ${batch.length} produits...`);

        // Simulation du traitement (à adapter avec votre API réelle)
        const batchResult = await this.processBatch(batch);
        this.results.push(...batchResult);

        console.log(`✅ Batch ${batchNum} complété`);
      } catch (error) {
        console.error(`❌ Erreur batch ${batchNum}:`, error.message);
        this.errors.push({ batch: batchNum, error: error.message });
      }
    }

    return this.summarize();
  }

  /**
   * Traite un batch (à adapter avec votre logique)
   */
  async processBatch(batch) {
    // Simule l'appel API
    return batch.map(product => ({
      ...product,
      description: `Description générée pour ${product.name || 'produit'}`,
      processed: true,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Résumé du traitement
   */
  summarize() {
    console.log('\n📊 Résumé du traitement');
    console.log('═'.repeat(50));
    console.log(`✅ Produits traités: ${this.results.length}`);
    console.log(`❌ Erreurs: ${this.errors.length}`);
    console.log(`📈 Taux de succès: ${((this.results.length / this.products.length) * 100).toFixed(2)}%`);
    console.log('═'.repeat(50));

    // Export automatique
    this.exportResults();

    return {
      success: true,
      processed: this.results.length,
      errors: this.errors.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Exporte les résultats
   */
  exportResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `./exports/products-bulk-${timestamp}.json`;

    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Résultats exportés: ${filename}`);
  }
}

/**
 * Parse les arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { ...DEFAULTS };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[++i], 10);
    } else if (args[i] === '--start-index' && args[i + 1]) {
      options.startIndex = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * Main
 */
async function main() {
  try {
    const options = parseArgs();
    const processor = new BulkProcessor(options);

    // Charge et traite
    await processor.loadProducts('./data/products.csv');
    await processor.processBatches();

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BulkProcessor;
