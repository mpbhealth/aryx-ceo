#!/usr/bin/env node
/**
 * Quality ratchet.
 *
 * This repo deploys every push to `main` straight to production with no gate, and
 * `vite build` does not typecheck — so on 2026-09-23 it was shipping green builds
 * with 337 type errors in them. A blocking `tsc` would be correct and would also
 * block every commit from day one, so instead this gates *regression*: the counts
 * may never rise, and the file that records them can only be lowered.
 *
 * Fail    — a count went up. The PR introduced new errors; fix them.
 * Improve — a count went down. Lower the baseline in the same commit (the message
 *           tells you the exact value) so the gain is locked in.
 * Pass    — counts match the baseline.
 *
 * Run: node scripts/quality-ratchet.mjs [--update]
 *      --update rewrites the baseline to today's counts. Use it only when the
 *      counts went DOWN; it refuses to raise a baseline.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = resolve(root, 'quality-baseline.json');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    // Both tools exit non-zero when they find problems; the output is what we want.
    return `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
}

function countTypeErrors() {
  const out = run('npx tsc --noEmit -p tsconfig.app.json');
  return (out.match(/error TS\d+/g) ?? []).length;
}

function countLintErrors() {
  const out = run('npx eslint . -f json');
  const start = out.indexOf('[');
  if (start === -1) return { errors: 0, warnings: 0 };
  try {
    const report = JSON.parse(out.slice(start));
    return {
      errors: report.reduce((n, f) => n + f.errorCount, 0),
      warnings: report.reduce((n, f) => n + f.warningCount, 0),
    };
  } catch {
    return { errors: 0, warnings: 0 };
  }
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const actual = { typeErrors: countTypeErrors(), ...countLintErrors() };

const checks = [
  ['type errors', actual.typeErrors, baseline.typeErrors],
  ['lint errors', actual.errors, baseline.errors],
  ['lint warnings', actual.warnings, baseline.warnings],
];

let failed = false;
let improved = false;

console.log('\nQuality ratchet\n');
for (const [label, now, max] of checks) {
  if (now > max) {
    console.log(`  FAIL  ${label}: ${now} (baseline ${max}, +${now - max})`);
    failed = true;
  } else if (now < max) {
    console.log(`  GAIN  ${label}: ${now} (baseline ${max}, −${max - now})`);
    improved = true;
  } else {
    console.log(`  ok    ${label}: ${now}`);
  }
}

if (process.argv.includes('--update')) {
  if (failed) {
    console.log('\nRefusing to update: a count went up. Ratchets only turn one way.\n');
    process.exit(1);
  }
  writeFileSync(
    baselinePath,
    `${JSON.stringify({ ...baseline, ...actual, updated: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
  );
  console.log('\nBaseline updated.\n');
  process.exit(0);
}

if (failed) {
  console.log('\nThis change adds problems that did not exist before. Fix them, or');
  console.log('explain in the PR why the baseline should move.\n');
  process.exit(1);
}

if (improved) {
  console.log('\nYou fixed something. Lock it in:  node scripts/quality-ratchet.mjs --update\n');
}

console.log('');
process.exit(0);
