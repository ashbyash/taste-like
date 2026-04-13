import { NextRequest, NextResponse } from 'next/server';
import { runHealthChecks, formatReport } from '@/lib/health/checks';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      ?? `https://${request.headers.get('host')}`;

    const report = await runHealthChecks(baseUrl);
    const message = formatReport(report);

    let telegramSent = true;
    try {
      await sendTelegramMessage({
        token: process.env.TELEGRAM_BOT_TOKEN!,
        chatId: process.env.TELEGRAM_CHAT_ID!,
        text: message,
      });
    } catch (tgErr) {
      telegramSent = false;
      console.error('Telegram send failed:', tgErr);
    }

    return NextResponse.json({
      success: true,
      data: { overallStatus: report.overallStatus, durationMs: report.durationMs, telegramSent },
    });
  } catch (err) {
    console.error('Health check cron error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
