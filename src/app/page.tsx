'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Category, Gender, BrandSlug } from '@/types/brand';
import { SOURCE_BRANDS } from '@/types/brand';
import type { Product, RecommendationResult } from '@/types/product';
import {
  SearchBar,
  BrandNav,
  GenderToggle,
  CategoryFilter,
  ProductGrid,
  RecommendSection,
  LoadingOverlay,
} from '@/components';
import { trackEvent } from '@/lib/analytics';

const AVAILABLE_BRANDS = SOURCE_BRANDS.filter(b => b.available).map(b => b.slug);

type Status = 'browsing' | 'loading' | 'results' | 'error';

function updateUrl(params?: Record<string, string>) {
  const url = params
    ? `${window.location.pathname}?${new URLSearchParams(params)}`
    : window.location.pathname;
  history.pushState({ view: params ? 'results' : 'browsing' }, '', url);
}

export default function Home() {
  const [status, setStatus] = useState<Status>('browsing');
  const [error, setError] = useState('');
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // URL search state
  const [urlInput, setUrlInput] = useState('');

  // Browsing state
  const [activeBrand, setActiveBrand] = useState<BrandSlug>('saint-laurent');
  const [gender, setGender] = useState<Gender>('women');
  const [category, setCategory] = useState<Category>('outerwear');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const isBrandAvailable = AVAILABLE_BRANDS.includes(activeBrand);
  const initialLoadDone = useRef(false);

  const fetchProducts = useCallback(async (cat: Category, brand: BrandSlug, g: Gender) => {
    if (!AVAILABLE_BRANDS.includes(brand)) return;
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      params.set('category', cat);
      params.set('brand', brand);
      params.set('gender', g);
      const res = await fetch(`/api/products/source?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch {
      // Silent fail — empty grid
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(category, activeBrand, gender);
  }, [category, activeBrand, gender, fetchProducts]);

  // Shared recommendation fetch logic
  async function fetchRecommendation(body: { productId: string } | { url: string }) {
    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setStatus('error');
        setError(data.error);
        history.pushState({ view: 'error' }, '');
        return;
      }
      setResult(data.data);
      setStatus('results');
      trackEvent({
        action: 'view_recommendations',
        params: {
          source_brand: data.data.source.brand,
          source_name: data.data.source.name,
          category: data.data.source.category,
          gender: data.data.source.gender,
          result_count: data.data.recommendations.length,
        },
      });

      if ('productId' in body) {
        updateUrl({ product: body.productId });
      } else {
        updateUrl({ url: body.url });
      }
    } catch {
      setStatus('error');
      setError('네트워크 연결을 확인해주세요. 잠시 후 다시 시도해주세요.');
      history.pushState({ view: 'error' }, '');
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    trackEvent({ action: 'search_url', params: { url: urlInput.trim() } });
    await fetchRecommendation({ url: urlInput.trim() });
  }

  async function handleProductSelect(productId: string) {
    const product = products.find(p => p.id === productId);
    trackEvent({
      action: 'select_source',
      params: {
        product_name: product?.name ?? productId,
        brand: product?.brand ?? activeBrand,
        category,
        gender,
      },
    });
    await fetchRecommendation({ productId });
  }

  function handleBack() {
    history.back();
  }

  // Browser back button support
  useEffect(() => {
    function onPopState() {
      setStatus('browsing');
      setResult(null);
      setError('');
      setUrlInput('');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Shareable URL: auto-load from query params on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const url = params.get('url');

    if (productId) {
      fetchRecommendation({ productId });
    } else if (url) {
      setUrlInput(url);
      fetchRecommendation({ url });
    }
  }, []);

  function handleGenderChange(g: Gender) {
    trackEvent({ action: 'select_gender', params: { gender: g } });
    setGender(g);
    setCategory('outerwear');
  }

  function handleCategoryChange(cat: Category) {
    trackEvent({ action: 'select_category', params: { category: cat, gender } });
    setCategory(cat);
  }

  function handleBrandChange(brand: BrandSlug) {
    trackEvent({ action: 'select_brand', params: { brand, gender } });
    setActiveBrand(brand);
    setCategory('outerwear');
  }

  const isBrowsing = status === 'browsing';

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">

        {/* Back-nav bar (results/error mode) */}
        {!isBrowsing && status !== 'loading' && (
          <div className="mb-6 flex items-center justify-between border-b border-base-300 pb-4">
            <button className="text-sm text-secondary hover:text-base-content transition-colors" onClick={handleBack}>
              ← 돌아가기
            </button>
            <span className="text-sm font-bold tracking-tight">생로랑 맛 자라 찾기</span>
          </div>
        )}

        {/* Zone A: Header */}
        {isBrowsing && (
          <div className="mb-8 border-b border-base-300 pb-8 text-center">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">생로랑 맛 자라 찾기</h1>
            <p className="mt-1.5 text-sm text-secondary">
              같은 맛, 다른 가격
            </p>
          </div>
        )}

        {/* Zone B: Search Bar */}
        {isBrowsing && (
          <div className="mx-auto mb-5 sm:max-w-2xl">
            <SearchBar
              value={urlInput}
              onChange={setUrlInput}
              onSubmit={handleUrlSubmit}
              loading={false}
            />
          </div>
        )}

        {/* Gender Toggle */}
        {isBrowsing && (
          <div className="mb-5">
            <GenderToggle selected={gender} onSelect={handleGenderChange} />
          </div>
        )}

        {/* Zone C: Brand Navigation */}
        {isBrowsing && (
          <div className="mb-4">
            <BrandNav active={activeBrand} onSelect={handleBrandChange} />
          </div>
        )}

        {/* Zone D: Category Filter */}
        {isBrowsing && isBrandAvailable && (
          <div className="mb-6">
            <CategoryFilter selected={category} onSelect={handleCategoryChange} />
          </div>
        )}

        {/* Zone E: Content */}

        {/* Loading */}
        {status === 'loading' && <LoadingOverlay />}

        {/* Error */}
        {status === 'error' && (
          <div className="mx-auto max-w-xl">
            <p className="text-center text-sm text-error">{error}</p>
            <div className="mt-4 text-center">
              <p className="mb-3 text-sm text-secondary">
                원하는 브랜드나 상품이 있다면 알려주세요
              </p>
              <a
                href="https://forms.gle/CZxZzYf6Atjj4Vu28"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-base-300 px-4 py-1.5 text-xs font-medium text-info hover:border-secondary hover:text-base-content transition-colors"
              >
                문의하기
              </a>
            </div>
          </div>
        )}

        {/* Browsing — product grid */}
        {isBrowsing && isBrandAvailable && (
          <ProductGrid
            variant="browse"
            products={products}
            onProductClick={handleProductSelect}
            loading={loadingProducts}
          />
        )}

        {/* Results */}
        {status === 'results' && result && (
          <RecommendSection
            source={result.source}
            recommendations={result.recommendations}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-base-300 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 text-center">
          <Link
            href="/style/zara-saint-laurent-style"
            className="text-xs text-secondary underline-offset-2 hover:text-base-content hover:underline"
          >
            자라에서 찾는 생로랑 스타일 모아보기
          </Link>
        </div>
        <div className="text-center">
          <a
            href="https://forms.gle/CZxZzYf6Atjj4Vu28"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-secondary underline-offset-2 hover:text-base-content hover:underline"
          >
            개선사항·문의사항 전달하기
          </a>
        </div>
      </footer>
    </main>
  );
}
