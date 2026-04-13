'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  { message: '상품 정보를 가져오는 중...', delay: 0 },
  { message: '스타일을 분석하는 중...', delay: 1500 },
  { message: '비슷한 아이템을 찾는 중...', delay: 4000 },
  { message: '거의 다 됐어요...', delay: 7000 },
];

export default function LoadingOverlay() {
  const [stepIndex, setStepIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      setTimeout(() => {
        setFade(false);
        setTimeout(() => {
          setStepIndex(i + 1);
          setFade(true);
        }, 150);
      }, step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <span className="loading loading-ring loading-lg" />
      <p
        className={`text-sm text-[var(--color-text-secondary)] transition-opacity duration-150 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {STEPS[stepIndex].message}
      </p>
    </div>
  );
}
