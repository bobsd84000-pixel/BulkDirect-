#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class BatchStatus {
  constructor(options = {}) {
    this.watch = options.watch || false;
    this.interval = (options.interval || 5) * 1000;
    this.logFile = './logs/batch-status.log';
  }

  /**
   * Lit le statut du fichier log
   */
  readStatus() {
    if (!fs.existsSync(this.logFile)) {
      return {
        status: 'IDLE',
        processed: 0,
        total: 0,
        startTime: null,
        errors: 0
      };
    }

    try {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { status: 'UNKNOWN', error: 'Impossible de lire le statut' };
    }
  }

  /**
   * Formate le statut
   */
  format(status) {
    const progress = status.total > 0 ? (status.processed / status.total * 100).toFixed(1) : 0;

    let elapsed = '00:00';
    let eta = '∞';

    if (status.startTime) {
      const start = new Date(status.startTime);
      const now = new Date();
      const diff = (now - start) / 1000;

      elapsed = this.formatSeconds(diff);

      if (status.processed > 0) {
        const rate = status.processed / diff;
        const remaining = status.total - status.processed;
        const etaSeconds = remaining / rate;
        eta = this.formatSeconds(etaSeconds);
      }
    }

    return `
📊 État du Batch BulkDirect
${'═'.repeat(60)}
Status: ${this.getStatusIcon(status.status)} ${status.status}
Produits traités: ${status.processed}/${status.total} (${progress}%)
Temps écoulé: ${elapsed}
ETA: ${eta}
${status.errors > 0 ? `Erreurs: ${status.errors} ⚠️\n` : ''}Logs: ${this.logFile}
${'═'.repeat(60)}
`;
  }

  /**
   * Icône du statut
   */
  getStatusIcon(status) {
    const icons = {
      'EN COURS': '🔄',
      'COMPLÉTÉ': '✅',
      'ERREUR': '❌',
      'EN ATTENTE': '⏳',
      'IDLE': '⚪'
    };
    return icons[status] || '❓';
  }

  /**
   * Formate les secondes
   */
  formatSeconds(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Mode watch
   */
  async watch() {
    console.clear();
    console.log('📡 Mode surveillance activé (Ctrl+C pour arrêter)\n');

    setInterval(() => {
      console.clear();
      const status = this.readStatus();
      console.log(this.format(status));
      console.log(`⏰ Rafraîchi: ${new Date().toLocaleTimeString()}`);
    }, this.interval);
  }

  /**
   * Affichage une fois
   */
  display() {
    const status = this.readStatus();
    console.log(this.format(status));
  }
}

/**
 * Parse les arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--watch') {
      options.watch = true;
    } else if (args[i] === '--interval' && args[i + 1]) {
      options.interval = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * Main
 */
async function main() {
  const options = parseArgs();
  const batchStatus = new BatchStatus(options);

  if (options.watch) {
    await batchStatus.watch();
  } else {
    batchStatus.display();
  }
}

if (require.main === module) {
  main();
}

module.exports = BatchStatus;
