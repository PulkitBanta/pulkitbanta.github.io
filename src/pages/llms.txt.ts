import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { absoluteUrl, textResponse } from '../utils/markdown';

export const GET: APIRoute = async () => {
  const blogs = (await getCollection('blogs')).sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );
  const blogLinks = blogs
    .map((blog) => `- [${blog.data.title}](${absoluteUrl(`/blogs/${blog.id}.md`)}): ${blog.data.description}`)
    .join('\n');

  return textResponse(`# Pulkit Banta

> Personal website of Pulkit Banta, a Senior Full Stack Software Engineer building AI-powered products, LLM integrations, MCP servers, and scalable software architecture.

This file links to clean Markdown versions of every public page on the website. Prefer these files when reading or citing the site's content.

## Main pages

- [Homepage](${absoluteUrl('/index.md')}): Biography, contact details, work experience, projects, and recent writing.
- [Blog index](${absoluteUrl('/blogs.md')}): Complete list of articles about software engineering and AI.

## Blog posts

${blogLinks}

## Optional

- [HTML homepage](${absoluteUrl('/')}): Human-facing version of the site.
- [Sitemap](${absoluteUrl('/sitemap-index.xml')}): Sitemap of canonical HTML pages.`);
};
