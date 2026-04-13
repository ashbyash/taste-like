import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findCombo } from '@/lib/seo/config';

export default async function StyleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ combo: string }>;
}) {
  const { combo } = await params;
  const config = findCombo(combo);
  if (!config) notFound();

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-base-content/50">
          <Link href="/" className="hover:text-base-content/80">홈</Link>
          <span className="mx-1.5">›</span>
          <span>{config.titleKo}</span>
        </nav>

        {children}

        {/* Footer */}
        <footer className="mt-16 border-t border-base-300 py-6 text-center pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Link
            href="/"
            className="text-xs text-base-content/40 underline-offset-2 hover:text-base-content/60 hover:underline"
          >
            생로랑 맛 자라 찾기 →
          </Link>
        </footer>
      </div>
    </div>
  );
}
