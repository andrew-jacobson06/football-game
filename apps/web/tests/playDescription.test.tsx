import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FormattedPlayText } from "../src/components/league/FormattedPlayText.tsx";
import { playText } from "../src/components/league/playDescription.ts";

test("the last-play and play-by-play formatter renders emphasis instead of raw markup", () => {
  const text = playText({
    player: "Blackie",
    playtype: "Run",
    yards: 4,
    newballon: 29,
    possession: "Home",
    tackler: "NL Bear",
    result: "Normal",
  });
  const rendered = renderToStaticMarkup(
    createElement(FormattedPlayText, { text }),
  );
  assert.match(rendered, /<strong>Blackie<\/strong> runs for 4 Yards/);
  assert.ok(!rendered.includes("&lt;strong&gt;"));
  assert.match(rendered, /Tackle made at the OWN 29 by NL Bear/);
});

test("sheet text is escaped and formatting never applies arbitrary attributes or executes markup", () => {
  const text = playText({
    player: "<img src=x onerror=alert(1)>",
    playtype: "Run",
    yards: 4,
    result: "Touchdown",
    possession: "Home",
  });
  const rendered = renderToStaticMarkup(
    createElement(FormattedPlayText, { text }),
  );
  assert.ok(!rendered.includes("<img"));
  assert.match(rendered, /play-outcome--touchdown/);
  const legacy = renderToStaticMarkup(
    createElement(FormattedPlayText, {
      text: '<strong onclick="alert(1)">Name</strong> <span style="color:red" onmouseover="alert(1)">TO on Downs</span>',
    }),
  );
  assert.ok(!legacy.includes("onclick"));
  assert.ok(!legacy.includes("onmouseover"));
  assert.match(legacy, /play-outcome--turnover/);
});
