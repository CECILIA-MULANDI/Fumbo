import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteNav } from "@/components/landing/site-nav";

export const metadata: Metadata = {
  title: "Building Fumbo · Fumbo blog",
  description:
    "How Fumbo uses Zama's FHEVM to build a confidential no-loss prize savings pool.",
};

async function loadArticle(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "content",
    "fumbo-on-fhevm.md",
  );
  return fs.readFile(filePath, "utf8");
}

export default async function BlogPage() {
  const markdown = await loadArticle();

  return (
    <>
      <SiteNav />
      <main className="px-6 py-16 md:px-12 md:py-24 lg:px-20 xl:px-32 2xl:px-40">
        <article className="mx-auto max-w-3xl">
          <div className="mb-8">
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back
            </Link>
          </div>
          <div
            className="prose max-w-none prose-headings:tracking-tight prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-border"
            style={{
              ["--tw-prose-body" as string]: "var(--foreground)",
              ["--tw-prose-headings" as string]: "var(--foreground)",
              ["--tw-prose-lead" as string]: "var(--foreground)",
              ["--tw-prose-links" as string]: "var(--accent)",
              ["--tw-prose-bold" as string]: "var(--foreground)",
              ["--tw-prose-counters" as string]: "var(--muted-foreground)",
              ["--tw-prose-bullets" as string]: "var(--muted-foreground)",
              ["--tw-prose-hr" as string]: "var(--border)",
              ["--tw-prose-quotes" as string]: "var(--foreground)",
              ["--tw-prose-quote-borders" as string]: "var(--border)",
              ["--tw-prose-captions" as string]: "var(--muted-foreground)",
              ["--tw-prose-code" as string]: "var(--foreground)",
              ["--tw-prose-pre-code" as string]: "var(--foreground)",
              ["--tw-prose-pre-bg" as string]: "var(--muted)",
              ["--tw-prose-th-borders" as string]: "var(--border)",
              ["--tw-prose-td-borders" as string]: "var(--border)",
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
