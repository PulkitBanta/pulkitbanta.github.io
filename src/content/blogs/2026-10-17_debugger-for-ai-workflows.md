---
title: 'Building debugger for AI workflows and runtime'
description: 'I built a debugger for the Agent workflows to help people configuring the agentic workflows test, debug and identify the failure modes before going live with it.'
pubDate: '2026-10-17'
---

### Conclusion

I built a debugger for the Agent workflows to help people configuring the agentic workflows test, debug and identify the failure modes before going live with it. This is also exposed over the MCP and helped the team to reduce error rates while configuring the flows without actual data, covering edge cases before doing a live run in production.

I think we will need more such tooling with the AI tools and features to ensure that we are not going blind into developing and building features, instead we need common debugging, testing and monitoring tools for AI features being built, allowing devs to fix the bugs with this new AI era of agentic systems.

---

### Problem

In the last year, I built AI agents and we also built a runtime to create custom workflows with agentic steps that allowed customers to solve specific use cases based on the data apart from what the platform was already doing.

You can assume this to be something like [Zapier](https://zapier.com/?utm_source=pulkitbanta.com) or [n8n](https://n8n.io/?utm_source=pulkitbanta.com). Since we have all the data already present, we can do a lot more with the same and allow the customers to automate simple tasks in their day and improve their productivity

And as we started configuring this, one thing we found was without performing some of the steps which are destructive, we cannot really go ahead and check the next steps and this becomes a blocking issue ☹️

### Idea

I started by checking Zapier and n8n to see how they do these things and allow users to test the steps, continue with the flow without actually taking a destructive action. And they do not, like I tried zapier with Hubspot and it needs data from hubspot to be there, it will create a company / object and will perform actions on top of that.

This was not a good approach, I do not want to create a mess with customer data and then going back and forth with them to clear all the mess I created. I feel like this is not a good way to work with enterprise customers, you need to have a way to solve the issues, create custom solutions and not expect that you can break things and just fix it like it's your own machine.

![](/images/blogs/debugger-for-ai-workflows/image1.png)

*VS Code debugger, via [code.visualstudio.com](https://code.visualstudio.com/docs/debugtest/debugging?utm_source=pulkitbanta.com)*

I remember that as a developer, for solving and checking for bugs we used to add debugger points, check the values of the variables and see what was there and what is happening after an action to understand and be able to replay this in a test, optimize the code etc. And the next question was what if I take the same thing and apply it for the runtime, I allow users to run a step and see its variables. They can change and modify the variables as per what is expected by the next step or break it and the flow can be updated to fix the same.

### Solution

So the same iterative approach and rules but over a new problem. Instead of going blind and fixing in production, you run the flow step by step and update the data. The same ability exposed over the MCP allowed users to automate this using Claude / ChatGPT and have those systems configure the flows, test it step by step without destructive actions and fix the flow before it was ever live on production.

![](/images/blogs/debugger-for-ai-workflows/image2.png)

Even added the ability to change and configure the time for the flow such that users can replay and plan for actions like data updating after 7 days, you do not have to wait for 7 days or anything, just move the clock past 7 days and you see how the flow would actually behave.

This empowered our customers and internal team configuring the workflows, similar to how you will think a developer was first empowered by using the debugger having to debug something critical which normally you would miss 😀

### How it works

At a high level:

- Each step runs on its own, and its output is saved as state that the next step reads.
- Destructive steps, like writing to a CRM or sending an email, are stopped in debug mode. You see what would have been sent and can enter the response yourself.
- You can edit variables between steps to test edge cases, like empty fields or unexpected values.
- The workflow's clock can be set by hand, so "wait 7 days" steps run against a fake time instead of really waiting.
- The same actions are available as MCP tools, so an agent can step through a flow by itself.
