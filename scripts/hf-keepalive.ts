/**
 * HF Space keep-alive + self-heal.
 * - Pings the Space root; if unhealthy, triggers /restart and polls to RUNNING.
 * - Exits 0 on healthy (already-healthy, woken-up, or successfully restarted).
 * - Exits 1 on unrecoverable failure.
 * - Emits GitHub Actions outputs for notify step.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/hf-keepalive.ts
 */

import { appendFileSync } from 'node:fs';
import { ensureSpaceHealthy } from '../src/lib/hf/control';

function writeGithubOutput(pairs: Record<string, string | number>) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const body = Object.entries(pairs).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  appendFileSync(file, body);
}

async function main() {
  console.log('=== HF Space Keep-Alive ===\n');

  const result = await ensureSpaceHealthy();

  console.log(`Action: ${result.action}`);
  if (result.finalStage) console.log(`Stage:  ${result.finalStage}`);
  if (result.finalStatus) console.log(`Status: ${result.finalStatus}`);
  console.log(`Elapsed: ${result.elapsedMs}ms`);
  if (result.note) console.log(`Note:   ${result.note}`);

  writeGithubOutput({
    action: result.action,
    stage: result.finalStage ?? '',
    status: String(result.finalStatus ?? ''),
    elapsed_ms: result.elapsedMs,
    note: result.note ?? '',
  });

  if (result.action === 'failed') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  writeGithubOutput({
    action: 'failed',
    stage: '',
    status: '',
    elapsed_ms: 0,
    note: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
