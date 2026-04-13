import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '생로랑 맛 자라 찾기 - 럭셔리 패션의 합리적 대안';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 24,
          }}
        >
          생로랑 맛 자라 찾기
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#94a3b8',
            fontWeight: 400,
          }}
        >
          같은 맛, 다른 가격
        </div>
      </div>
    ),
    { ...size }
  );
}
