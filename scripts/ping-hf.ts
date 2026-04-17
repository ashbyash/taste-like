/**
 * HF Space diagnostic ping.
 * Usage: node --env-file=.env.local --import tsx scripts/ping-hf.ts
 * Verifies env vars, tests health + /embed endpoint with a small sample image.
 */

const HF_SPACE_URL = process.env.HF_SPACE_URL;
const HF_SPACE_API_KEY = process.env.HF_SPACE_API_KEY;
const HF_TOKEN = process.env.HF_TOKEN;

const SAMPLE_IMAGE = 'https://www.ysl.com/on/demandware.static/-/Sites-saintlaurent-master/default/dwd9e6b93a/images/SaintLaurent_8181262AABC_1000_A.jpg';

async function main() {
  console.log('=== HF Space Ping ===\n');

  console.log('Env vars:');
  console.log(`  HF_SPACE_URL: ${HF_SPACE_URL ? HF_SPACE_URL : '❌ MISSING'}`);
  console.log(`  HF_SPACE_API_KEY: ${HF_SPACE_API_KEY ? `set (${HF_SPACE_API_KEY.length} chars)` : '❌ MISSING'}`);
  console.log(`  HF_TOKEN: ${HF_TOKEN ? `set (${HF_TOKEN.length} chars)` : '❌ MISSING'}`);

  if (!HF_SPACE_URL || !HF_SPACE_API_KEY || !HF_TOKEN) {
    console.error('\nMissing env vars. Abort.');
    process.exit(1);
  }

  // 1. Health check — try root URL
  console.log('\n--- 1. Root GET (wake check) ---');
  try {
    const t0 = Date.now();
    const res = await fetch(HF_SPACE_URL, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
    });
    const elapsed = Date.now() - t0;
    console.log(`  Status: ${res.status} ${res.statusText} (${elapsed}ms)`);
    console.log(`  Content-Type: ${res.headers.get('content-type')}`);
    const body = (await res.text()).slice(0, 500);
    console.log(`  Body (first 500 chars): ${body}`);
  } catch (err) {
    console.error(`  Fetch error: ${err instanceof Error ? err.message : err}`);
  }

  // 2. /embed endpoint with small sample
  console.log('\n--- 2. POST /embed (real call) ---');
  try {
    const t0 = Date.now();
    const res = await fetch(`${HF_SPACE_URL}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`,
        'X-API-Key': HF_SPACE_API_KEY,
      },
      body: JSON.stringify({ image_url: SAMPLE_IMAGE, text: 'black leather handbag' }),
    });
    const elapsed = Date.now() - t0;
    console.log(`  Status: ${res.status} ${res.statusText} (${elapsed}ms)`);
    console.log(`  Content-Type: ${res.headers.get('content-type')}`);

    const text = await res.text();
    if (res.ok) {
      try {
        const data = JSON.parse(text);
        console.log(`  dim: ${data.dim}, elapsed_ms: ${data.elapsed_ms}, mode: ${data.mode}`);
        console.log(`  embedding[0..5]: ${data.embedding?.slice(0, 5)}`);
      } catch {
        console.log(`  Body: ${text.slice(0, 500)}`);
      }
    } else {
      console.error(`  Error body: ${text.slice(0, 1000)}`);
    }
  } catch (err) {
    console.error(`  Fetch error: ${err instanceof Error ? err.message : err}`);
  }

  // 3. /embed without API key (sanity check — should fail if auth is enforced)
  console.log('\n--- 3. POST /embed without X-API-Key (auth check) ---');
  try {
    const res = await fetch(`${HF_SPACE_URL}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({ image_url: SAMPLE_IMAGE }),
    });
    console.log(`  Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`  Body: ${text.slice(0, 300)}`);
  } catch (err) {
    console.error(`  Fetch error: ${err instanceof Error ? err.message : err}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
