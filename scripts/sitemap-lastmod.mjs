// Works out a `lastmod` date for each sitemap URL from git history, so the
// sitemap updates on its own whenever a page's source files are committed.
import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { URL } from 'node:url';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BLOGS_DIR = 'src/content/blogs';

function git(args, timeout = 10_000) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).trim();
  } catch {
    return '';
  }
}

const isShallow = () => git(['rev-parse', '--is-shallow-repository']) === 'true';

// A shallow clone only knows the latest commit, which would give every page the same date.
// Cloudflare builds from a shallow clone, so try to fetch the full history first.
if (isShallow()) git(['fetch', '--unshallow', '--quiet'], 120_000);
const hasHistory = git(['rev-parse', '--is-shallow-repository']) === 'false';
if (!hasHistory) {
  console.warn('[sitemap] No full git history found, so lastmod falls back to blog pubDate.');
}

/** ISO date of the latest commit touching any of the paths, or undefined. */
function lastCommitDate(paths) {
  if (!hasHistory) return undefined;
  const existing = paths.filter((p) => existsSync(p));
  if (existing.length === 0) return undefined;
  return git(['log', '-1', '--format=%cI', '--', ...existing]) || undefined;
}

function blogSources(slug) {
  const file = join(BLOGS_DIR, `${slug}.md`);
  if (!existsSync(file)) return [];
  // Include images the post references, so swapping a diagram counts as an update.
  const images = [...readFileSync(file, 'utf8').matchAll(/\]\((\/images\/[^)\s]+)\)/g)].map((m) =>
    join('public', m[1])
  );
  return [file, ...images];
}

function pubDate(slug) {
  const file = join(BLOGS_DIR, `${slug}.md`);
  const match = existsSync(file) && readFileSync(file, 'utf8').match(/^pubDate:\s*['"]?([^'"\n]+)/m);
  return match ? new Date(match[1]).toISOString() : undefined;
}

const allBlogs = readdirSync(BLOGS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => join(BLOGS_DIR, f));

// Pages that list blogs change whenever a blog does.
const PAGE_SOURCES = {
  '/': ['src/pages/index.astro', 'src/components', ...allBlogs],
  '/blogs/': ['src/pages/blogs.astro', 'src/components/BlogList.astro', ...allBlogs],
};

/** `serialize` hook for @astrojs/sitemap. */
export function addLastmod(item) {
  const path = new URL(item.url).pathname;
  const blog = path.match(/^\/blogs\/([^/]+)\/$/);
  const lastmod = blog
    ? (lastCommitDate(blogSources(blog[1])) ?? pubDate(blog[1]))
    : lastCommitDate(PAGE_SOURCES[path] ?? []);
  if (lastmod) item.lastmod = lastmod;
  item.priority = path === '/' ? 1.0 : path === '/blogs/' ? 0.8 : 0.7;
  return item;
}
