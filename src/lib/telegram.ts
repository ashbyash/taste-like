const TELEGRAM_API = 'https://api.telegram.org';

interface SendMessageOptions {
  token: string;
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

export async function sendTelegramMessage(
  options: SendMessageOptions,
): Promise<void> {
  const { token, chatId, text, parseMode = 'Markdown' } = options;
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}
