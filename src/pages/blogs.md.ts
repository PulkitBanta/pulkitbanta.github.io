import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { absoluteUrl, markdownResponse } from '../utils/markdown';

export const GET: APIRoute = async () => {
  const blogs = (await getCollection('blogs')).sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );
  const blogList = blogs
    .map(
      (blog) =>
        `- [${blog.data.title}](${absoluteUrl(`/blogs/${blog.id}`)}) ([Markdown](${absoluteUrl(`/blogs/${blog.id}.md`)}), ${blog.data.pubDate}) — ${blog.data.description}`
    )
    .join('\n');

  return markdownResponse(`# Pulkit Banta's Blog

Thoughts on software engineering, AI, LLM integrations, and scalable product architecture.

${blogList}

---

- [Pulkit Banta's homepage](${absoluteUrl('/')})
- Canonical page: ${absoluteUrl('/blogs')}`);
};
