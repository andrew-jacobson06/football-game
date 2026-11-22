import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleMarkdown } from "../src/components/league/ArticleMarkdown.tsx";

const render = (children: string) => renderToStaticMarkup(createElement(ArticleMarkdown, { children }));

test("article heading HTML images render with their alt text and dimensions alongside Markdown", () => {
  const html = render('## 8. <img src="https://example.com/wildfire.png" alt="Portland Wildfire logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Frog — **Portland Wildfire**');
  assert.match(html, /<h2>8\. <img [^>]*src="https:\/\/example.com\/wildfire.png"/);
  assert.match(html, /alt="Portland Wildfire logo"/);
  assert.match(html, /width="32" height="32"/);
  assert.match(html, /Frog — <strong>Portland Wildfire<\/strong><\/h2>/);
  assert.ok(!html.includes("&lt;img"));
});

test("ordinary Markdown images and mixed HTML formatting still render", () => {
  const html = render('![Team photo](https://example.com/team.png)\n\nA <strong>great</strong> season and **playoffs**.');
  assert.match(html, /<img src="https:\/\/example.com\/team.png" alt="Team photo"/);
  assert.match(html, /<strong>great<\/strong>/);
  assert.match(html, /<strong>playoffs<\/strong>/);
});

test("article HTML strips scripts, event handlers, dangerous URLs and injected styles", () => {
  const html = render('<img src="https://example.com/logo.png" onerror="alert(1)" style="position:fixed;inset:0" /><script>alert(2)</script>\n\n<a href="javascript:alert(3)">Bad link</a>\n\n<img src="javascript:alert(4)" />');
  assert.ok(html.includes('src="https://example.com/logo.png"'));
  assert.ok(!/onerror|<script|javascript:|style=|alert\(/.test(html));
});

test("image tag examples inside code blocks remain literal examples", () => {
  const html = render('```html\n<img src="example.png" />\n```');
  assert.match(html, /<code[^>]*>&lt;img/);
});
