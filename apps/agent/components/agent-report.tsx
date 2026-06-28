"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownClassName = [
  "text-[13px] leading-6 text-foreground/95",
  "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h1]:mt-0 [&_h1]:mb-4 [&_h1]:border-b [&_h1]:border-border/70 [&_h1]:pb-3 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-[0.16em]",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-[13px] [&_h4]:font-semibold",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1.5",
  "[&_blockquote]:my-4 [&_blockquote]:border-l [&_blockquote]:border-foreground/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_hr]:my-5 [&_hr]:border-border/70",
  "[&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-4",
  "[&_:not(pre)>code]:border [&_:not(pre)>code]:border-border/70 [&_:not(pre)>code]:bg-muted/70 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[12px]",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border/80 [&_pre]:bg-input/70 [&_pre]:p-3 [&_pre]:text-[12px] [&_pre]:leading-relaxed",
  "[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_th]:border [&_th]:border-border/80 [&_th]:bg-muted/70 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_td]:border [&_td]:border-border/70 [&_td]:px-3 [&_td]:py-2",
].join(" ");

export function AgentReport({ markdown }: { readonly markdown: string }) {
  return (
    <div className={markdownClassName}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
