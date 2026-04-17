import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, type ReplyKeyboardMarkup } from '@/lib/telegram';
import { runHealthChecks, formatReport } from '@/lib/health/checks';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_KEYBOARD: ReplyKeyboardMarkup = {
  keyboard: [
    ['/status', '/health'],
    ['/embed', '/cleanup'],
    ['/crawl', '/help'],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
}

const VALID_SLUGS = [
  'zara', 'cos', 'arket', 'uniqlo',
  'miu-miu', 'lemaire', 'massimo-dutti', 'saint-laurent', 'the-row',
] as const;

const ALL_BRANDS = [
  'Saint Laurent', 'Miu Miu', 'Lemaire', 'The Row',
  'ZARA', 'COS', 'ARKET', 'UNIQLO', 'Massimo Dutti',
] as const;

const BRAND_NAME_MAP: Record<string, string> = {
  'zara': 'ZARA',
  'cos': 'COS',
  'arket': 'ARKET',
  'uniqlo': 'UNIQLO',
  'massimo-dutti': 'Massimo Dutti',
  'miu-miu': 'Miu Miu',
  'lemaire': 'Lemaire',
  'saint-laurent': 'Saint Laurent',
  'the-row': 'The Row',
} as const;

const HELP_TEXT = `*taste-like Bot*

/crawl <brand> — 브랜드 크롤링 시작
/crawl all — 전체 브랜드 크롤링
/embed — missing 임베딩 일괄 처리
/embed <brand> — 특정 브랜드 임베딩 처리
/cleanup — 깨진 이미지 마킹 + unavailable 상품 삭제
/status — DB 상품 현황
/health — 헬스체크 실행
/help — 명령어 안내

*브랜드 목록:*
zara, cos, arket, uniqlo, miu-miu, lemaire, massimo-dutti, saint-laurent, the-row`;

// GET: one-time webhook registration (call from browser/curl via Vercel)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taste-like.vercel.app'}/api/telegram/webhook`;

  const params = new URLSearchParams({ url: webhookUrl });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) params.set('secret_token', secret);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?${params}`);
  const data = await res.json();

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // Verify Telegram webhook secret_token
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ ok: true }, { status: 401 });
    }
  }

  const update: TelegramUpdate = await request.json();
  const chatId = update.message?.chat.id;
  const text = update.message?.text?.trim();

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  // Auth: only allow configured chat
  if (String(chatId) !== process.env.TELEGRAM_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const reply = (msg: string) =>
    sendTelegramMessage({
      token,
      chatId: String(chatId),
      text: msg,
      replyMarkup: DEFAULT_KEYBOARD,
    });

  try {
    const [command, ...args] = text.split(/\s+/);

    switch (command) {
      case '/crawl':
        await handleCrawl(args[0], reply);
        break;
      case '/embed':
        await handleEmbed(args[0], reply);
        break;
      case '/cleanup':
        await handleCleanup(reply);
        break;
      case '/status':
        await handleStatus(reply);
        break;
      case '/health':
        await handleHealth(reply);
        break;
      case '/help':
      case '/start':
        await reply(HELP_TEXT);
        break;
      default:
        await reply(`알 수 없는 명령어입니다. /help 를 입력해보세요.`);
    }
  } catch (err) {
    console.error('Telegram webhook error:', err);
    await reply('오류가 발생했습니다. 잠시 후 다시 시도해주세요.').catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

async function handleCrawl(slug: string | undefined, reply: (msg: string) => Promise<void>) {
  if (!slug) {
    await reply('사용법: `/crawl <brand>` 또는 `/crawl all`\n\n브랜드: ' + VALID_SLUGS.join(', '));
    return;
  }

  if (slug !== 'all' && !VALID_SLUGS.includes(slug as typeof VALID_SLUGS[number])) {
    await reply(`잘못된 브랜드: "${slug}"\n\n사용 가능: ${VALID_SLUGS.join(', ')}, all`);
    return;
  }

  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) {
    await reply('GITHUB_PAT 환경변수가 설정되지 않았습니다.');
    return;
  }

  const res = await fetch(
    'https://api.github.com/repos/ashbyash/taste-like/actions/workflows/on-demand-crawl.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ ref: 'main', inputs: { brand: slug } }),
    },
  );

  if (res.status === 204) {
    const label = slug === 'all' ? '전체 브랜드' : slug;
    await reply(`🚀 *${label}* 크롤링 시작됨\n\n완료되면 알림이 옵니다.`);
  } else {
    const body = await res.text();
    await reply(`GitHub Actions 트리거 실패 (${res.status}): ${body}`);
  }
}

async function handleEmbed(slug: string | undefined, reply: (msg: string) => Promise<void>) {
  // Check missing count first
  const brandName = slug ? BRAND_NAME_MAP[slug] : undefined;

  if (slug && slug !== 'all' && !brandName) {
    await reply(`잘못된 브랜드: "${slug}"\n\n사용 가능: ${VALID_SLUGS.join(', ')}`);
    return;
  }

  let missingQuery = supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', true)
    .is('embedding', null);

  if (brandName) {
    missingQuery = missingQuery.eq('brand', brandName);
  }

  const { count: missingCount } = await missingQuery;

  if (missingCount === 0) {
    const label = brandName ?? '전체';
    await reply(`${label}: missing 임베딩이 없습니다.`);
    return;
  }

  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) {
    await reply('GITHUB_PAT 환경변수가 설정되지 않았습니다.');
    return;
  }

  const brand = brandName ?? 'all';
  const res = await fetch(
    'https://api.github.com/repos/ashbyash/taste-like/actions/workflows/on-demand-embed.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ ref: 'main', inputs: { brand } }),
    },
  );

  if (res.status === 204) {
    const label = brandName ?? '전체';
    await reply(`🔄 *${label}* 임베딩 생성 시작 (${missingCount}개 missing)\n\n완료되면 알림이 옵니다.`);
  } else {
    const body = await res.text();
    await reply(`GitHub Actions 트리거 실패 (${res.status}): ${body}`);
  }
}

async function handleCleanup(reply: (msg: string) => Promise<void>) {
  // Show current counts before triggering
  const [missingRes, unavailableRes] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
      .is('embedding', null),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', false),
  ]);

  const missing = missingRes.count ?? 0;
  const unavailable = unavailableRes.count ?? 0;

  if (missing === 0 && unavailable === 0) {
    await reply('정리할 상품이 없습니다.');
    return;
  }

  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) {
    await reply('GITHUB_PAT 환경변수가 설정되지 않았습니다.');
    return;
  }

  const res = await fetch(
    'https://api.github.com/repos/ashbyash/taste-like/actions/workflows/on-demand-cleanup.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  );

  if (res.status === 204) {
    const lines = [
      '🧹 *Cleanup 시작*',
      '',
      `  이미지 체크 대상: ${missing}개 (embedding missing)`,
      `  삭제 대상: ${unavailable}개 (unavailable)`,
      '',
      '완료되면 알림이 옵니다.',
    ];
    await reply(lines.join('\n'));
  } else {
    const body = await res.text();
    await reply(`GitHub Actions 트리거 실패 (${res.status}): ${body}`);
  }
}

async function handleStatus(reply: (msg: string) => Promise<void>) {
  const results = await Promise.all(
    ALL_BRANDS.map(async (brand) => {
      const { count } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('brand', brand)
        .eq('is_available', true);
      return { brand, count: count ?? 0 };
    }),
  );

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const lines = results.map(r => `  ${r.brand}: ${r.count}`);

  await reply(`📊 *상품 현황* (총 ${total}개)\n\n${lines.join('\n')}`);
}

async function handleHealth(reply: (msg: string) => Promise<void>) {
  await reply('🔍 헬스체크 실행 중...');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taste-like.vercel.app';
  const report = await runHealthChecks(baseUrl);
  const message = formatReport(report);

  await reply(message);
}
