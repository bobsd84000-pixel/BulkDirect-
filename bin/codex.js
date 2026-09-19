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
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function doctor() {
  try {
    const checks = {
      'Node.js': await checkNode(),
      'npm': await checkNpm(),
      'Git': await checkGit(),
      'Config directory': checkConfigDir(),
      'Git repository': await checkRepo(),
      'package.json': checkPackageJson(),
      'node_modules': checkNodeModules(),
      'Disk space': await checkDiskSpace(),
      'Network (DNS)': await checkNetwork(),
      '.env file': checkEnvFile(),
      'Docker': await checkDocker(),
      'GitHub CLI': await checkGitHubCli()
    };

    const results = {};
    let allPass = true;

    Object.entries(checks).forEach(([check, result]) => {
      results[check] = {
        status: result.pass ? 'ok' : 'warning',
        message: result.message
      };
      if (!result.pass) allPass = false;
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      status: allPass ? 'ok' : 'warning',
      checks: results
    }, null, 2));

    process.exit(allPass ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message
    }, null, 2));
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

async function checkRepo() {
  try {
    await execAsync('git rev-parse --git-dir');
    return { pass: true, message: 'Git repo detected' };
  } catch {
    return { pass: false, message: 'Not in a git repository' };
  }
}

function checkPackageJson() {
  const path_pkg = path.join(process.cwd(), 'package.json');
  const exists = fs.existsSync(path_pkg);
  return { pass: exists, message: exists ? path_pkg : 'Not found' };
}

function checkNodeModules() {
  const path_nm = path.join(process.cwd(), 'node_modules');
  const exists = fs.existsSync(path_nm);
  return { pass: exists, message: exists ? 'node_modules found' : 'node_modules not installed' };
}

async function checkDiskSpace() {
  try {
    const { stdout } = await execAsync('df -h . | tail -1 | awk \'{print $4}\'');
    return { pass: true, message: `${stdout.trim()} available` };
  } catch {
    return { pass: false, message: 'Unable to check disk space' };
  }
}

async function checkNetwork() {
  try {
    await execAsync('node -e "require(\'dns\').resolve(\'8.8.8.8\', (err) => process.exit(err ? 1 : 0))"', { timeout: 3000 });
    return { pass: true, message: 'DNS resolvable' };
  } catch {
    return { pass: false, message: 'Network unreachable' };
  }
}

function checkEnvFile() {
  const env_path = path.join(process.cwd(), '.env');
  const env_example = path.join(process.cwd(), '.env.example');
  const has_env = fs.existsSync(env_path);
  const has_example = fs.existsSync(env_example);

  if (has_env) return { pass: true, message: '.env file present' };
  if (has_example) return { pass: false, message: '.env.example found, .env missing' };
  return { pass: false, message: 'No .env or .env.example' };
}

async function checkDocker() {
  try {
    await execAsync('docker --version');
    return { pass: true, message: 'Docker installed' };
  } catch {
    return { pass: false, message: 'Docker not installed (optional)' };
  }
}

async function checkGitHubCli() {
  try {
    await execAsync('gh --version');
    return { pass: true, message: 'GitHub CLI installed' };
  } catch {
    return { pass: false, message: 'GitHub CLI not installed (optional)' };
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Codex — General-purpose diagnostics CLI

Usage:
  codex doctor      Run environment diagnostics
  codex --help      Show this help
  codex -h          Short help

Examples:
  codex doctor
  npm run codex:doctor

    `);
    process.exit(0);
  }

  if (command === 'doctor') {
    await doctor();
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.error('Run "codex --help" for usage');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
