// Content for the Connectio product page (/connectio) and its Markdown twin (/connectio.md).
// Facts here mirror the Connectio README and INSTALL.md — update both together on each release.

const repo = 'https://github.com/PulkitBanta/connectio';
const latest = `${repo}/releases/latest`;
const raw = 'https://raw.githubusercontent.com/PulkitBanta/connectio/main';

export const connectio = {
  name: 'Connectio',
  version: '1.1.0',
  released: '2026-05-31',
  license: 'MIT',
  tagline: 'One local address for all your dev servers.',
  summary:
    'Connectio is a free, open-source desktop app that puts every local dev server behind one address. Route requests by path, watch each one live, and share it all through a Cloudflare tunnel, with no nginx config to write.',
  description:
    'Connectio is a free, open-source local proxy manager for macOS, Windows and Linux. Route requests between local dev servers by path, inspect every request live, and share them through a temporary Cloudflare tunnel.',
  repo,
  latest,
  installGuide: `${repo}/blob/main/INSTALL.md`,
  // Bump ?v= when og.png changes so social platforms refetch it.
  ogImage: '/images/connectio/og.png?v=20261007',
  video: { src: '/images/connectio/tour.mp4', poster: '/images/connectio/tour-poster.jpg', duration: 'PT1M' },

  problems: [
    {
      title: 'CORS errors between ports',
      body: 'Your frontend on :3000 calls the API on :3001, and the browser blocks it. Behind one origin there is nothing cross-origin left to block.',
    },
    {
      title: 'Cookies that never arrive',
      body: 'A session cookie set by the auth service on :4000 is never sent to the app on :3000. On one address, cookies just work.',
    },
    {
      title: 'Webhooks that need a public URL',
      body: 'Stripe, GitHub and Slack need to call your machine. Tick one box and get a temporary trycloudflare.com URL for the whole setup.',
    },
    {
      title: 'Reverse-proxy config you rewrite every time',
      body: 'No nginx.conf, no Caddyfile, no Docker network. Point-and-click rules you can save, switch and share as JSON.',
    },
  ],

  steps: [
    {
      title: 'Add your servers',
      body: 'Click + and add each local server as an app: a name and a target like http://localhost:3001.',
    },
    {
      title: 'Write route rules',
      body: 'Add path rules such as /api/* or /auth/login. Rules match in order, so the first match wins.',
    },
    {
      title: 'Hit Start',
      body: 'Pick a port (8080 by default) and start the server. Everything is now reachable on one address.',
    },
    {
      title: 'Watch every request',
      body: 'Requests stream into Recent Requests. Click one to see its matched rule, target and headers.',
    },
    {
      title: 'Share when you need to',
      body: 'Turn on the Cloudflare tunnel for a public URL while the server runs. It closes when you stop.',
    },
  ],

  features: [
    {
      title: 'Wildcard route rules',
      body: 'Glob-style paths like /api/* routed to any local target, matched in priority order.',
    },
    {
      title: 'Live request logs',
      body: 'Method, path, status and timing for every request, with full details on click.',
    },
    { title: 'Cloudflare tunnels', body: 'A temporary public URL per config, opened on start and closed on stop.' },
    { title: 'Save and load configs', body: 'Keep one setup per project and switch between them in one click.' },
    { title: 'JSON import and export', body: 'Copy a config to the clipboard, save it as a file, or paste one in.' },
    { title: 'Built-in JSON editor', body: 'Edit any config as raw JSON with validation before it saves.' },
  ],

  downloads: [
    { os: 'macOS', detail: 'Apple Silicon', file: 'Connectio-1.1.0-arm64.dmg', key: 'mac' },
    { os: 'Windows', detail: '64-bit installer', file: 'Connectio.Setup.1.1.0.exe', key: 'win' },
    { os: 'Linux', detail: 'AppImage', file: 'Connectio-1.1.0.AppImage', key: 'linux' },
    { os: 'Linux', detail: 'Debian / Ubuntu', file: 'connectio_1.1.0_amd64.deb', key: 'deb' },
  ].map((d) => ({ ...d, url: `${repo}/releases/download/v1.1.0/${d.file}` })),

  install: {
    unix: `curl -fsSL ${raw}/scripts/install.sh | sh`,
    windows: `irm ${raw}/scripts/install.ps1 | iex`,
  },

  config: `{
  "apps": [
    {
      "id": "api",
      "name": "API Server",
      "targetUrl": "http://localhost:3001",
      "enabled": true,
      "rules": [{ "id": "r1", "matchPath": "/api/*", "enabled": true }]
    }
  ],
  "port": 8080,
  "cloudflareTunnel": false
}`,

  faqs: [
    {
      q: 'What is Connectio?',
      a: 'Connectio is a desktop app that runs a local reverse proxy. You add your local dev servers, write path rules like /api/* → localhost:3001, and reach all of them through one address such as localhost:8080.',
    },
    {
      q: 'Is Connectio free?',
      a: 'Yes. Connectio is free and open source under the MIT license. The source code is on GitHub.',
    },
    {
      q: 'Which platforms does it run on?',
      a: 'macOS on Apple Silicon, Windows (64-bit) and Linux (AppImage or .deb). Intel Macs and other architectures can build it from source.',
    },
    {
      q: 'How does Connectio fix CORS errors in local development?',
      a: 'CORS errors happen because your frontend and API run on different ports, which the browser treats as different origins. Connectio serves both from the same port, so requests are same-origin and the browser has nothing to block.',
    },
    {
      q: 'How is it different from nginx or Caddy?',
      a: 'nginx and Caddy are production web servers configured with text files you edit and reload. Connectio is built for local development: rules are edited in a UI, take effect when you start, every request is logged live, and setups are saved as JSON you can switch between.',
    },
    {
      q: 'Do I need Docker?',
      a: 'No. Connectio proxies to servers already running on your machine, however you start them: npm scripts, Go binaries, Docker containers with published ports, or anything else that listens on localhost.',
    },
    {
      q: 'How do Cloudflare tunnels work in Connectio?',
      a: 'Enable "Cloudflare tunnel" before starting the server. Connectio starts a Cloudflare Quick Tunnel, shows the public trycloudflare.com URL and closes it when you stop. It needs cloudflared installed on your PATH. Anyone with the URL can reach every route, so only use it for development.',
    },
    {
      q: 'Where are my configs stored?',
      a: 'As JSON files in your OS user data folder: ~/Library/Application Support/connectio/configs on macOS, %APPDATA%/connectio/configs on Windows and ~/.config/connectio/configs on Linux.',
    },
    {
      q: 'Why does my OS warn me when I first open it?',
      a: 'Connectio is not code-signed yet, so macOS and Windows ask you to confirm the first launch. The install guide walks through it, or use the install script, which skips the prompts.',
    },
    {
      q: 'How do I update Connectio?',
      a: 'Download the new release and install it over the old one, or re-run the install script. Your saved configs are kept.',
    },
  ],
};
