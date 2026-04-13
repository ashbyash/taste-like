import { NextRequest, NextResponse } from 'next/server';
import { getSourceProducts } from '@/lib/supabase/queries';
import { CATEGORIES, type Category, type Gender } from '@/types/brand';

const SLUG_TO_BRAND: Record<string, string> = {
  'saint-laurent': 'Saint Laurent',
  'miu-miu': 'Miu Miu',
  'lemaire': 'Lemaire',
  'the-row': 'The Row',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category') as Category | null;
    const brandSlug = searchParams.get('brand');
    const gender = (searchParams.get('gender') as Gender | null) ?? 'women';
    const page = parseInt(searchParams.get('page') ?? '1', 10);

    if (category && !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 카테고리입니다' },
        { status: 400 },
      );
    }

    if (gender !== 'women' && gender !== 'men') {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 성별입니다' },
        { status: 400 },
      );
    }

    const brand = brandSlug ? SLUG_TO_BRAND[brandSlug] : undefined;

    const { products, total } = await getSourceProducts({ brand, category: category ?? undefined, gender, page });

    return NextResponse.json({
      success: true,
      data: { products, total, page },
    });
  } catch (err) {
    console.error('Source products API error:', err);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
