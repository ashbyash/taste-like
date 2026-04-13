import Link from 'next/link';

export default function CtaBanner() {
  return (
    <section className="rounded-lg bg-base-200 px-6 py-8 text-center">
      <h2 className="text-lg font-bold sm:text-xl">
        다른 브랜드도 비교해보세요
      </h2>
      <p className="mt-2 text-sm text-secondary">
        URL을 입력하면 AI가 비슷한 스타일의 합리적 대안을 찾아드립니다
      </p>
      <Link href="/" className="mt-4 inline-block rounded-full border border-primary bg-primary px-5 py-2 text-sm font-medium text-primary-content transition-colors hover:bg-base-content">
        직접 찾아보기 →
      </Link>
    </section>
  );
}
