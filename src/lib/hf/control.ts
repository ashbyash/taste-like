/**
 * Hugging Face Space control utilities.
 * Talks to HF Hub API (huggingface.co) to check runtime state and restart
 * the Space when it goes into RUNTIME_ERROR or similar broken states.
 */

const HF_API = 'https://huggingface.co/api';

function getConfig() {
  const spaceUrl = process.env.HF_SPACE_URL;
  const hfToken = process.env.HF_TOKEN;
  const repoId = process.env.HF_SPACE_REPO_ID ?? 'ashbyash/taste-like-embed';

  if (!spaceUrl) throw new Error('HF_SPACE_URL not set');
  if (!hfToken) throw new Error('HF_TOKEN not set');

  return { spaceUrl, hfToken, repoId };
}

export interface PingResult {
  ok: boolean;
  status: number;
  elapsedMs: number;
  body?: string;
}

export async function pingSpace(timeoutMs = 30_000): Promise<PingResult> {
  const { spaceUrl, hfToken } = getConfig();
  const t0 = Date.now();

  try {
    const res = await fetch(spaceUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${hfToken}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsedMs = Date.now() - t0;
    const contentType = res.headers.get('content-type') ?? '';
    // Accept 200 + JSON response from our FastAPI app.
    // HF platform errors typically return 5xx HTML.
    const ok = res.ok && contentType.includes('application/json');
    const body = ok ? undefined : (await res.text()).slice(0, 200);
    return { ok, status: res.status, elapsedMs, body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - t0,
      body: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface SpaceRuntime {
  stage: string; // RUNNING, BUILDING, SLEEPING, PAUSED, RUNTIME_ERROR, NO_APP_FILE, APP_STARTING, ...
  hardware?: { current?: string };
  errorMessage?: string;
}

export async function getSpaceRuntime(): Promise<SpaceRuntime> {
  const { repoId, hfToken } = getConfig();
  const res = await fetch(`${HF_API}/spaces/${repoId}/runtime`, {
    headers: { 'Authorization': `Bearer ${hfToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HF runtime fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function restartSpace(factoryReboot = false): Promise<SpaceRuntime> {
  const { repoId, hfToken } = getConfig();
  const url = new URL(`${HF_API}/spaces/${repoId}/restart`);
  if (factoryReboot) url.searchParams.set('factory', 'true');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hfToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HF restart failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export type HealthAction = 'already-healthy' | 'woken-up' | 'restarted' | 'failed';

export interface EnsureHealthyResult {
  action: HealthAction;
  finalStage?: string;
  finalStatus?: number;
  elapsedMs: number;
  note?: string;
}

interface EnsureOptions {
  allowRestart?: boolean;   // if true, POST /restart on failure
  factoryReboot?: boolean;  // use ?factory=true
  maxWaitMs?: number;       // total polling budget after restart
  pollIntervalMs?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check Space health and recover if needed.
 *
 * Flow:
 *   1. ping root URL. If 200 + JSON → already-healthy.
 *   2. if allowRestart, POST /restart, poll /runtime until stage === RUNNING.
 *   3. ping once more to confirm app is serving.
 */
export async function ensureSpaceHealthy(
  options: EnsureOptions = {},
): Promise<EnsureHealthyResult> {
  const {
    allowRestart = true,
    factoryReboot = false,
    maxWaitMs = 180_000,
    pollIntervalMs = 10_000,
  } = options;

  const start = Date.now();

  // Step 1: ping
  const initialPing = await pingSpace();
  if (initialPing.ok) {
    return {
      action: 'already-healthy',
      finalStatus: initialPing.status,
      elapsedMs: Date.now() - start,
    };
  }

  if (!allowRestart) {
    return {
      action: 'failed',
      finalStatus: initialPing.status,
      elapsedMs: Date.now() - start,
      note: `Ping failed (${initialPing.status}): ${initialPing.body ?? 'no body'}`,
    };
  }

  // Step 2: check current stage — if SLEEPING, a simple re-ping may wake it
  // without burning a restart. Wait up to 60s first for wake-up.
  try {
    const runtime = await getSpaceRuntime();
    if (runtime.stage === 'SLEEPING' || runtime.stage === 'APP_STARTING' || runtime.stage === 'BUILDING') {
      const wakeDeadline = Math.min(Date.now() + 60_000, start + maxWaitMs);
      while (Date.now() < wakeDeadline) {
        await sleep(5_000);
        const p = await pingSpace();
        if (p.ok) {
          return {
            action: 'woken-up',
            finalStage: runtime.stage,
            finalStatus: p.status,
            elapsedMs: Date.now() - start,
          };
        }
      }
    }
  } catch {
    // fall through to restart
  }

  // Step 3: trigger restart
  try {
    await restartSpace(factoryReboot);
  } catch (err) {
    return {
      action: 'failed',
      elapsedMs: Date.now() - start,
      note: `Restart API failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Step 4: poll runtime until RUNNING (or timeout)
  let lastStage: string | undefined;
  while (Date.now() - start < maxWaitMs) {
    await sleep(pollIntervalMs);
    try {
      const rt = await getSpaceRuntime();
      lastStage = rt.stage;
      if (rt.stage === 'RUNNING') break;
      if (rt.stage === 'RUNTIME_ERROR' || rt.stage === 'BUILD_ERROR' || rt.stage === 'NO_APP_FILE') {
        return {
          action: 'failed',
          finalStage: rt.stage,
          elapsedMs: Date.now() - start,
          note: rt.errorMessage ?? `Stage settled in ${rt.stage} after restart`,
        };
      }
    } catch {
      // transient; keep polling
    }
  }

  if (lastStage !== 'RUNNING') {
    return {
      action: 'failed',
      finalStage: lastStage,
      elapsedMs: Date.now() - start,
      note: `Did not reach RUNNING within ${maxWaitMs}ms`,
    };
  }

  // Step 5: final ping confirms app is serving (not just runtime alive)
  const finalPing = await pingSpace();
  if (!finalPing.ok) {
    return {
      action: 'failed',
      finalStage: lastStage,
      finalStatus: finalPing.status,
      elapsedMs: Date.now() - start,
      note: `Runtime RUNNING but ping still failing (${finalPing.status})`,
    };
  }

  return {
    action: 'restarted',
    finalStage: lastStage,
    finalStatus: finalPing.status,
    elapsedMs: Date.now() - start,
  };
}
