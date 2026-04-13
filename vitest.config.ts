import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    alias: {
      'server-only': new URL('./src/__mocks__/server-only.ts', import.meta.url).pathname,
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      HF_SPACE_URL: 'https://test.hf.space',
      HF_SPACE_API_KEY: 'test-api-key',
      HF_TOKEN: 'test-hf-token',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
