/**
 * GA4 Custom Dimensions Registry
 *
 * When adding a new event parameter, register it as a custom dimension in GA4:
 * Admin → Custom definitions → Custom dimensions → Create
 *
 * Currently registered parameters:
 * - product_name (이벤트)
 * - brand (이벤트)
 * - category (이벤트)
 * - price (이벤트)
 * - similarity (이벤트)
 * - gender (이벤트)
 * - url (이벤트)
 *
 * Unregistered parameters won't appear in GA4 Explore reports.
 * Data before registration is NOT retroactively available.
 */

type GtagEvent = {
  action: string;
  params?: Record<string, string | number>;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent({ action, params }: GtagEvent) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
}
