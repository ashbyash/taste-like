import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DESCRIBE_TIMEOUT_MS = parseInt(process.env.DESCRIBE_TIMEOUT_MS ?? '5000', 10);

const SYSTEM_PROMPT = `You are a fashion product analyst. Analyze the fashion product image and extract visual attributes.

Return a JSON object with exactly these fields:
- silhouette: shape and structure (e.g., "oversized boxy jacket", "structured flap bag")
- material: fabric or leather type visible (e.g., "quilted leather", "wool blend tweed")
- color: primary color(s) (e.g., "black", "cream and navy")
- hardware: visible hardware or closures (e.g., "gold chain strap", "silver buckle"). Use "none" if not applicable
- style: fashion style keywords (e.g., "minimalist casual", "classic formal evening")
- details: distinctive visual details (e.g., "chevron quilting, logo clasp", "wide lapels, double-breasted")

Rules:
- Describe ONLY what you see in the image
- Use common fashion vocabulary, not brand-specific terms
- Keep each field to 2-8 words
- Do not mention brand names`;

interface FashionAttributes {
  silhouette: string;
  material: string;
  color: string;
  hardware: string;
  style: string;
  details: string;
}

let openai: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openai;
}

function buildFashionText(attrs: FashionAttributes): string {
  const parts = [
    `${attrs.color} ${attrs.material} ${attrs.silhouette}`,
  ];
  if (attrs.hardware && attrs.hardware !== 'none') {
    parts.push(attrs.hardware);
  }
  if (attrs.details) parts.push(attrs.details);
  if (attrs.style) parts.push(`${attrs.style} style`);
  return parts.join(', ');
}

function parseAttributes(raw: string): FashionAttributes | null {
  try {
    const parsed = JSON.parse(raw);
    const required = [
      'silhouette', 'material', 'color',
      'hardware', 'style', 'details',
    ] as const;
    for (const key of required) {
      if (typeof parsed[key] !== 'string' || !parsed[key].trim()) {
        return null;
      }
    }
    return parsed as FashionAttributes;
  } catch {
    return null;
  }
}

export async function describeFashionItem(
  imageUrl: string,
  productName: string,
  category: string,
  description?: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const userText = description
    ? `Product: ${productName}\nCategory: ${category}\nDescription: ${description}`
    : `Product: ${productName}\nCategory: ${category}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DESCRIBE_TIMEOUT_MS);

  let response;
  try {
    response = await client.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
              { type: 'text', text: userText },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
        temperature: 0.1,
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timer);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  const attrs = parseAttributes(content);
  if (!attrs) return null;

  return buildFashionText(attrs);
}
