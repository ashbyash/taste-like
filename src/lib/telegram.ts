const TELEGRAM_API = 'https://api.telegram.org';

export interface ReplyKeyboardMarkup {
  keyboard: string[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
}

interface SendMessageOptions {
  token: string;
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: ReplyKeyboardMarkup;
}

export async function sendTelegramMessage(
  options: SendMessageOptions,
): Promise<void> {
  const { token, chatId, text, parseMode = 'Markdown', replyMarkup } = options;
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${errBody}`);
  }
}
