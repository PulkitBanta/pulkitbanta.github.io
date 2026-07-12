import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { absoluteUrl, markdownResponse } from '../../utils/markdown';

export const getStaticPaths = (async () => {
  const blogs = await getCollection('blogs');
  return blogs.map((blog) => ({
    params: { slug: blog.id },
    props: { blog },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { blog } = props;

  return markdownResponse(`# ${blog.data.title}

> ${blog.data.description}

Published: ${blog.data.pubDate}
Author: Pulkit Banta
Canonical URL: ${absoluteUrl(`/blogs/${blog.id}`)}

${blog.body}

---

- [All blog posts](${absoluteUrl('/blogs')})
- [Pulkit Banta's homepage](${absoluteUrl('/')})`);
};
