import { createElement, type ReactNode } from "react";

type Fragment = {
  tag: "span" | "strong";
  className?: string;
  children: Array<Fragment | string>;
};
const decode = (value: string) =>
  value.replace(
    /&(amp|lt|gt|quot|#39);/g,
    (_, entity: string) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[entity] ?? "",
  );

/** Render only the formatting our play descriptions produce, never arbitrary HTML. */
export function FormattedPlayText({ text }: { text: string }) {
  const root: Fragment = { tag: "span", children: [] };
  const stack = [root];
  for (const token of text.split(/(<\/?(?:strong|span)\b[^>]*>)/gi)) {
    if (/^<\/(strong|span)>$/i.test(token)) {
      if (stack.length > 1) stack.pop();
    } else if (/^<(strong|span)\b/i.test(token)) {
      const tag = /^<strong\b/i.test(token) ? "strong" : "span";
      const className = /play-outcome--touchdown|color:\s*green/i.test(token)
        ? "play-outcome--touchdown"
        : /play-outcome--turnover|color:\s*red/i.test(token)
          ? "play-outcome--turnover"
          : undefined;
      const fragment: Fragment = { tag, className, children: [] };
      stack.at(-1)!.children.push(fragment);
      stack.push(fragment);
    } else stack.at(-1)!.children.push(decode(token));
  }
  const render = (fragment: Fragment, key: number): ReactNode =>
    createElement(
      fragment.tag,
      { key, className: fragment.className },
      fragment.children.map((child, index) =>
        typeof child === "string" ? child : render(child, index),
      ),
    );
  return render(root, 0);
}
