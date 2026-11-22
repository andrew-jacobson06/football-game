import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

/** Parse article HTML before sanitizing it so inline images become safe elements. */
export function ArticleMarkdown({ children }: { children: string }) {
  return createElement(ReactMarkdown, { rehypePlugins: [rehypeRaw, rehypeSanitize], children });
}
