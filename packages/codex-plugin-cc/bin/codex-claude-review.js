#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.codex');
const CONFIG_FILE = path.join(CONFIG_DIR, 'claude-review.json');

async function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

async function enable() {
  try {
    await ensureConfigDir();

    const config = {
      enabled: true,
      enabledAt: new Date().toISOString(),
      version: '1.0.0',
      features: {
        autoReview: true,
        conflictDetection: true,
        codeQualityGates: true
      }
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    console.log('✅ Codex Claude review enabled');
    console.log(`📁 Config saved to: ${CONFIG_FILE}`);
    console.log('\n📋 Features enabled:');
    console.log('  • Auto code review');
    console.log('  • Conflict detection');
    console.log('  • Code quality gates');

    return true;
  } catch (error) {
    console.error('❌ Failed to enable Codex Claude review:', error.message);
    process.exit(1);
  }
}

async function doctor() {
  try {
    console.log('\n🔍 Codex Claude review diagnostics\n');

    const checks = {
      'Node.js version': await checkNode(),
      'npm installed': await checkNpm(),
      'Git installed': await checkGit(),
      'Config directory': checkConfigDir(),
      'Claude review enabled': checkEnabled(),
      'Repo initialized': await checkRepo()
    };

    let allPass = true;
    Object.entries(checks).forEach(([check, result]) => {
      const icon = result.pass ? '✅' : '⚠️';
      console.log(`${icon} ${check}: ${result.message}`);
      if (!result.pass) allPass = false;
    });

    console.log('\n' + '='.repeat(50));
    if (allPass) {
      console.log('✅ All diagnostics passed');
      process.exit(0);
    } else {
      console.log('⚠️  Some checks need attention');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

async function checkNode() {
  try {
    const { stdout } = await execAsync('node --version');
    return { pass: true, message: stdout.trim() };
  } catch {
    return { pass: false, message: 'Not installed' };
  }
}

async function checkNpm() {
  try {
    const { stdout } = await execAsync('npm --version');
    return { pass: true, message: stdout.trim() };
  } catch {
    return { pass: false, message: 'Not installed' };
  }
}

async function checkGit() {
  try {
    const { stdout } = await execAsync('git --version');
    return { pass: true, message: stdout.trim() };
  } catch {
    return { pass: false, message: 'Not installed' };
  }
}

function checkConfigDir() {
  const exists = fs.existsSync(CONFIG_DIR);
  return { pass: exists, message: exists ? CONFIG_DIR : 'Not created' };
}

function checkEnabled() {
  const exists = fs.existsSync(CONFIG_FILE);
  if (!exists) {
    return { pass: false, message: 'Not enabled (run: codex-claude-review enable)' };
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return { pass: config.enabled, message: `Enabled since ${config.enabledAt}` };
  } catch {
    return { pass: false, message: 'Config corrupted' };
  }
}

async function checkRepo() {
  try {
    await execAsync('git rev-parse --git-dir');
    return { pass: true, message: 'Git repo detected' };
  } catch {
    return { pass: false, message: 'Not in a git repository' };
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Codex Claude review - BulkDirect integration

Usage:
  codex-claude-review enable   Enable Claude review for this project
  codex-claude-review doctor   Run diagnostics
  codex-claude-review --help   Show this help
    `);
    process.exit(0);
  }

  if (command === 'enable') {
    await enable();
  } else if (command === 'doctor') {
    await doctor();
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.error('Run "codex-claude-review --help" for usage');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
