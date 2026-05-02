---
title: "Ever Wondered How ChatGPT Shows You Its Sources? Let's Dive into Streaming Citations!"
description: 'Learn how ChatGPT streams real-time citations using hidden markers, web search results, and smart UI swaps.'
pubDate: '2025-09-10'
---

You know that feeling when ChatGPT gives you a super helpful answer, and then you see those little numbers next to it, pointing to where the info came from? Those are citations, and they're a big deal for trusting what an AI tells you. But have you ever stopped to think about _how_ ChatGPT actually streams those citations to your screen in real-time?

Today, we're pulling back the curtain to explore:

- What exactly are these citations in a ChatGPT response?
- When and how does ChatGPT weave them into its answers?
- What does that real-time streaming response look like under the hood?

Let's get into it!

## What's the Deal with Citations?

Think of a citation as a digital "receipt" for information. When you're reading an article or a research paper, citations tell you which book or website the author got their facts from. For ChatGPT, it's pretty similar. When it searches the web for an answer, it doesn't just give you the info; it also points you to the original sources.

Why is this so cool? Because it lets _you_ check the facts! You can click on those citations, go to the original website, and see the information for yourself. This builds a ton of trust, making ChatGPT feel less like a magic black box and more like a super-smart assistant.

## Seeing is Believing: An Example

These citations pop up right after ChatGPT has done some digging on the web. It's like it says, "Hey, I found this awesome info, and here are the places I got it from!" It gathers a bunch of sources and then smartly orders them based on how well they match your question.

If you ask, "What's the flight speed of a common bird?" ChatGPT quickly searches the web and starts typing out an answer. But how does it manage to show you the answer _and_ the sources at the same time, as it's typing? That's the real magic!

Here's a simplified peek at what happens:

1. **You ask:** "What's the flight speed of a common bird?"
2. **ChatGPT searches:** It hits the web for "Fastest bird flight speed." _(via a tool_call)_
3. **It gathers and sorts:** It finds, say, 10 relevant web pages, quickly reads through them, summarizes the key info, and remembers where each piece came from. _(done by the backend)_
4. **It answers and cites:** As it builds your answer, it cleverly inserts those citations right where they belong, linking back to its sources. _(rendering on UI)_

### How Does ChatGPT Sneak Those Citations In?

Many AI tools now offer citations, but they all do it a little differently. We're focusing on ChatGPT's slick way of streaming them inline with the content.

When ChatGPT is sending you text, it's not just sending plain words. It's sending a stream of "events" that tell your browser what to do. Here's a snippet of what that might look like:

```go
event: delta
data: {
  "p": "",
  "o": "patch",
  "v": [
    {
      "p": "/message/content/parts/0",
      "o": "append",
      "v": " \u200bcite\u200bturn0search11\u200bturn0search0\u200bturn0search15\u200b.\n\nAerial speed-of-"
    },
    {
      "p": "/message/metadata/content_references",
      "o": "append",
      "v": [
        {
          "matched_text": "\u200bcite\u200bturn0search11\u200bturn0search0\u200bturn0search15\u200b",
          "start_idx": 301,
          "end_idx": 348,
          "type": "hidden"
        }
      ]
    }
  ]
}
```

"Whoa, what are those weird `\u200b`, `\u200b`, and `\u200b` characters?" you might ask. Great question! These aren't your everyday letters or symbols. They're special "private-use" Unicode characters. Think of them as secret codes that ChatGPT uses. Since these characters aren't part of normal html, they won't accidentally mess up your browser's display. ChatGPT uses them as temporary placeholders to mark where a citation should go.

Then, in another part of the stream, ChatGPT sends the actual details about the references:

```go
{
  "p": "/message/metadata/content_references",
  "o": "append",
  "v": [
    {
      "matched_text": "Aerial speed-of-animals tracking also lists **a top of 59\u202fkm/h and peak bursts up to 156\u202fkm/h**",
      "start_idx": 351,
      "end_idx": 446,
      "safe_urls": [],
      "refs": [],
      "alt": "Aerial speed-of-animals tracking also lists **a top of 59\u202fkm/h and peak bursts up to 156\u202fkm/h**",
      "prompt_text": null,
      "type": "attribution",
      "attributable_index": "348-0",
      "attributions": null,
      "attributions_debug": null
    }
  ]
}
```

**Now, let's think about how these special Unicode markers get added to the response in the first place.** It's important to remember that ChatGPT is an application built on top of a powerful Large Language Model (LLM) – let's imagine it's something like OpenAI's GPT-5 for this example. To make sure those unique Unicode characters land in just the right spot, there has to be some kind of instruction. This could be part of the LLM's initial "system prompt" or specific details added _after_ a tool call (like a `search_web` tool, which is what we'll call it, even if the real name is different) brings back the actual search results.

These instructions could be pretty straightforward, like: "When using content from `content_references`, wrap it with `\u200bcite\u200bturn0search11` as a prefix and suffix to tell the user about the source."

Adding these instructions ensures that the underlying LLM formats the response as expected by the UI and the backend / api layer properly handles sending the data across in chunks which is then built in the view layer that is the browser.

Once your browser sees these special codes and gets the actual reference data, it's like a quick swap! It replaces those secret Unicode characters with the real, clickable citation links. And just like that, you see a neat little number or link pointing to the source, seamlessly integrated into the text. Pretty clever, right?

## Wrapping It Up: The Trust Factor

So, citations in ChatGPT are more than just footnotes; they're a commitment to transparency. They only pop up after a "tool call" – like when ChatGPT searches the web – because that's when it's pulling in real, external information. The smart use of those private-use Unicode characters ensures that the streaming text flows smoothly without breaking your user interface.

The whole process is a well-orchestrated: **you ask → ChatGPT searches → it finds sources → it streams text with hidden markers → your UI swaps markers for clickable citations.** It's a seamless experience that boosts your trust by letting you verify the facts yourself.

By the way, if you're building your own AI tool, you could use a similar trick! Instead of complex Unicode, you could define simple placeholders like **`#ref_source_1`** in your streamed text and then replace them with the actual source links on the user interface. It simplifies things and makes for a great user experience.
