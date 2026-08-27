/**
 * LUMIK Gemini Batch Processor
 * Appelle /api/describe-products par batches de 10 produits
 * Agrège les résultats → exports CSV enrichi
 * 
 * À utiliser dans src/pages ou CLI si Node.js disponible
 * 
 * Usage (navigateur):
 * - Load dans devtools console
 * - lumikDescriber.process().then(() => console.log('Done'))
 * 
 * Usage (Node.js):
 * - node batch-processor.js
 */

const BATCH_SIZE = 10;
const API_ENDPOINT = '/api/describe-products';

class LumikDescriber {
  constructor(batchSize = BATCH_SIZE) {
    this.batchSize = batchSize;
    this.allProducts = [];
    this.enriched = [];
    this.currentBatch = 0;
  }

  /**
   * Charge tous les produits du CSV
   */
  async loadProducts() {
    try {
      const response = await fetch('/data/products.csv');
      const csv = await response.text();
      this.allProducts = this._parseCSV(csv);
      console.log(`✅ Loaded ${this.allProducts.length} products`);
      return this.allProducts;
    } catch (err) {
      console.error('Failed to load products:', err);
      return [];
    }
  }

  /**
   * Simple CSV parser
   */
  _parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const product = {};
      headers.forEach((h, idx) => {
        product[h.trim()] = values[idx]?.trim() || '';
      });
      products.push(product);
    }

    return products;
  }

  /**
   * Appelle API pour un batch
   */
  async processBatch(start, limit) {
    try {
      const response = await fetch(
        `${API_ENDPOINT}?start=${start}&limit=${limit}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        this.enriched.push(...data.results);
        console.log(
          `✅ Batch ${Math.floor(start / limit) + 1}: ${data.results.length} products described`
        );
      }
      return data.results;
    } catch (err) {
      console.error(`❌ Batch ${start}-${start + limit} failed:`, err.message);
      return [];
    }
  }

  /**
   * Lance le processing par batches
   */
  async process() {
    await this.loadProducts();

    if (this.allProducts.length === 0) {
      console.error('No products to process');
      return;
    }

    const totalBatches = Math.ceil(this.allProducts.length / this.batchSize);

    console.log(`\n🚀 Processing ${this.allProducts.length} products in ${totalBatches} batches...`);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * this.batchSize;
      const limit = this.batchSize;

      await this.processBatch(start, limit);

      // Progress
      const percent = Math.round(((i + 1) / totalBatches) * 100);
      console.log(`📊 Progress: ${percent}% (${this.enriched.length}/${this.allProducts.length})`);

      // Throttle entre batches
      if (i < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ All batches complete. ${this.enriched.length} products enriched.`);
    return this.enriched;
  }

  /**
   * Exporte en CSV
   */
  exportCSV() {
    if (this.enriched.length === 0) {
      console.error('No enriched data to export');
      return null;
    }

    const headers = Object.keys(this.enriched[0]);
    const rows = this.enriched.map((p) => headers.map((h) => `"${p[h] || ''}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    return csv;
  }

  /**
   * Télécharge le CSV (navigateur)
   */
  downloadCSV(filename = 'products-enriched.csv') {
    const csv = this.exportCSV();
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`💾 Downloaded: ${filename}`);
  }

  /**
   * Sauvegarde en localStorage (navigateur)
   */
  saveToStorage() {
    const csv = this.exportCSV();
    if (!csv) return;

    localStorage.setItem('lumik_products_enriched', csv);
    console.log(`💾 Saved to localStorage (${csv.length} bytes)`);
  }
}

// Export pour Node.js + navigateur
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LumikDescriber;
}

// Global pour devtools
if (typeof window !== 'undefined') {
  window.lumikDescriber = new LumikDescriber();
}

// CLI usage (Node.js)
if (typeof require !== 'undefined' && require.main === module) {
  const describer = new LumikDescriber();
  describer.process().then(() => {
    console.log('\n📄 Exporting CSV...');
    const csv = describer.exportCSV();
    if (csv) {
      const fs = require('fs');
      fs.writeFileSync('./products-enriched.csv', csv);
      console.log('✅ Saved: products-enriched.csv');
    }
  });
}
