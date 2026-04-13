import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecommendations, getRecommendationsByProductId, PipelineError } from '@/lib/recommend/pipeline';
import { YslScraperError } from '@/lib/scrapers/ysl';

const UrlSchema = z.object({ url: z.string().url() });
const ProductIdSchema = z.object({ productId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Product ID path: pre-scraped product → skip scraping/embedding
    const byId = ProductIdSchema.safeParse(body);
    if (byId.success) {
      const data = await getRecommendationsByProductId(byId.data.productId);
      return NextResponse.json({ success: true, data });
    }

    // URL path: on-demand scraping (original flow)
    const byUrl = UrlSchema.safeParse(body);
    if (!byUrl.success) {
      return NextResponse.json(
        { success: false, error: '올바른 URL을 입력해주세요. 상품 페이지 URL을 붙여넣어 주세요.' },
        { status: 400 },
      );
    }

    const data = await getRecommendations(byUrl.data.url);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof PipelineError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode },
      );
    }

    if (err instanceof YslScraperError) {
      const friendly: Record<string, string> = {
        FETCH_FAILED: '이 상품 정보를 가져올 수 없어요. 단종되었거나 일시적인 오류일 수 있습니다.',
        PARSE_FAILED: '이 상품 페이지를 분석할 수 없어요. 페이지 구조가 변경되었을 수 있습니다.',
        MISSING_DATA: '이 상품의 정보가 불완전해요. 다른 상품으로 시도해주세요.',
        UNKNOWN_CATEGORY: '이 상품 카테고리는 아직 지원하지 않아요.',
      };
      const message = friendly[err.code] ?? err.message;
      const status = err.code === 'FETCH_FAILED' ? 502 : 400;
      return NextResponse.json(
        { success: false, error: message },
        { status },
      );
    }

    console.error('Recommend API error:', err);
    return NextResponse.json(
      { success: false, error: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }
}
