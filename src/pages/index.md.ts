import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { projects } from '../data/projects';
import { profile } from '../data/profile';
import { absoluteUrl, markdownResponse } from '../utils/markdown';

export const GET: APIRoute = async () => {
  const blogs = (await getCollection('blogs')).sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  const blogList = blogs
    .map(
      (blog) =>
        `- [${blog.data.title}](${absoluteUrl(`/blogs/${blog.id}`)}) (${blog.data.pubDate}): ${blog.data.description}`
    )
    .join('\n');

  const projectList = projects
    .map(
      (project) =>
        `- [${project.title}](${project.pageLink ? absoluteUrl(project.pageLink) : project.repoLink}) (${project.dayTime}): ${project.description}`
    )
    .join('\n');

  return markdownResponse(`# Pulkit Banta

${profile.intro}

## About

${profile.interests}

${profile.hometown}

## Contact

- Email: [pulkitbanta01@gmail.com](mailto:pulkitbanta01@gmail.com)
- GitHub: [github.com/pulkitbanta](https://github.com/pulkitbanta)
- LinkedIn: [linkedin.com/in/pulkitbanta](https://linkedin.com/in/pulkitbanta)

## Blog posts

${blogList}

See the [blog index](${absoluteUrl('/blogs')}) for all posts.

## Projects

${projectList}

---

Canonical page: ${absoluteUrl('/')}`);
};
