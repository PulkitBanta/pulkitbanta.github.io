/**
 * Cloudflare Worker: tracks fetches of the site's plain-text/markdown
 * endpoints (*.md, /llms.txt) in GA4 via the Measurement Protocol.
 *
 * These files are served as static text with no JavaScript, so the
 * GTM/gtag snippet embedded in the HTML pages never runs for them.
 * Requests to them are almost always AI/LLM crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, etc.), not browsers, so this worker records a
 * server-side event instead, then transparently proxies to the origin.
 *
 * Required Worker environment variables (set in the Cloudflare dashboard
 * under Settings > Variables, GA_API_SECRET as an encrypted secret):
 *   - GA_MEASUREMENT_ID  e.g. "G-XXXXXXXXXX"
 *   - GA_API_SECRET      GA4 Measurement Protocol API secret
 */

function isTrackedPath(pathname) {
  return pathname.endsWith('.md') || pathname === '/llms.txt';
}

async function trackFetch(request, url, env) {
  if (!env.GA_MEASUREMENT_ID || !env.GA_API_SECRET) return;

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const payload = {
    // No cookies/session on a bot request, so a per-request id is fine here.
    client_id: crypto.randomUUID(),
    events: [
      {
        name: 'llm_content_fetch',
        params: {
          page_location: url.toString(),
          page_path: url.pathname,
          content_type: url.pathname === '/llms.txt' ? 'llms_txt' : 'markdown_page',
          crawler_user_agent: userAgent,
          engagement_time_msec: 1,
        },
      },
    ],
  };

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA_MEASUREMENT_ID}&api_secret=${env.GA_API_SECRET}`;

  try {
    await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // Never let analytics failures affect the real response.
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (isTrackedPath(url.pathname)) {
      ctx.waitUntil(trackFetch(request, url, env));
    }

    return fetch(request);
  },
};
