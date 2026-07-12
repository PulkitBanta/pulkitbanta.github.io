import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { projects } from '../data/projects';
import { workExperience } from '../data/workExperience';
import { absoluteUrl, markdownResponse } from '../utils/markdown';

export const GET: APIRoute = async () => {
  const blogs = (await getCollection('blogs')).sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  const blogList = blogs
    .map(
      (blog) =>
        `- [${blog.data.title}](${absoluteUrl(`/blogs/${blog.id}`)}) (${blog.data.pubDate}) — ${blog.data.description}`
    )
    .join('\n');

  const experience = workExperience
    .map(
      (job) =>
        `### ${job.role} at ${job.company}\n\n${job.timeWithDuration}\n\n${job.shortDescription}\n\n${job.list
          .map((item) => `- ${item}`)
          .join('\n')}`
    )
    .join('\n\n');

  const projectList = projects
    .map((project) => `- [${project.title}](${project.repoLink}) (${project.dayTime}) — ${project.description}`)
    .join('\n');

  return markdownResponse(`# Pulkit Banta

Senior Software Engineer — Full Stack

Building AI-powered products with Golang, Node.js, React, and TypeScript. Focused on LLM integrations, MCP servers, scalable architecture, and team leadership.

## Contact

- Email: [pulkitbanta01@gmail.com](mailto:pulkitbanta01@gmail.com)
- GitHub: [github.com/pulkitbanta](https://github.com/pulkitbanta)
- LinkedIn: [linkedin.com/in/pulkitbanta](https://linkedin.com/in/pulkitbanta)

## Blog posts

${blogList}

See the [blog index](${absoluteUrl('/blogs')}) for all posts.

## Work experience

${experience}

## Projects

${projectList}

---

Canonical page: ${absoluteUrl('/')}`);
};
