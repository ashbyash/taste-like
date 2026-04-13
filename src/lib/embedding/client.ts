const HF_SPACE_URL = process.env.HF_SPACE_URL!;
const HF_SPACE_API_KEY = process.env.HF_SPACE_API_KEY!;
const HF_TOKEN = process.env.HF_TOKEN!;

interface EmbedResponse {
  embedding: number[];
  dim: number;
  elapsed_ms: number;
  mode: string;
}

export async function getEmbedding(
  imageUrl: string,
  text?: string,
): Promise<number[]> {
  const body: Record<string, string> = { image_url: imageUrl };
  if (text?.trim()) {
    body.text = text.trim();
  }

  const response = await fetch(`${HF_SPACE_URL}/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HF_TOKEN}`,
      'X-API-Key': HF_SPACE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Embedding failed (${response.status}): ${errText}`);
  }

  const data: EmbedResponse = await response.json();

  if (data.dim !== 768) {
    throw new Error(`Unexpected embedding dim: ${data.dim}`);
  }

  return data.embedding;
}
