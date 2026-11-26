import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  HTML_BLOCK_TAGS, HTML_IMAGE_PROTOCOLS, HTML_IMAGE_SIZE, HTML_INLINE_TAGS, HTML_LINK_PROTOCOLS, HTML_STRIP_TAGS,
} from "../lib/htmlPolicy";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import katexCss from "katex/dist/katex.min.css?inline";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ResolvedTheme } from "../lib/theme";
import type { Locale } from "../lib/i18n";
import type { MarkdownTheme } from "../lib/markdownTheme";
import { configuredMermaid } from "../lib/mermaid";
import { resolveAssetPath } from "../lib/paths";

const BASE_CSS = `
  :root { --doc-bg: #fcfcfd; --doc-fg: #24272d; --doc-muted: #68707c; --doc-border: #dfe3e8; --doc-accent: #3268c8; --doc-panel: #f3f5f8; --doc-mark: #fff0a8; --doc-radius: 9px; --doc-heading: -apple-system, "Segoe UI", system-ui, sans-serif; }
  body { background: var(--doc-bg); color: var(--doc-fg); font-family: -apple-system, "Segoe UI", system-ui, sans-serif; line-height: 1.75; max-width: 46rem; margin: 2rem auto; padding: 0 1.5rem; }
  h1, h2, h3, h4, h5, h6 { color: var(--doc-fg); font-family: var(--doc-heading); letter-spacing: -0.015em; }
  img { max-width: 100%; border: 1px solid var(--doc-border); border-radius: var(--doc-radius); }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid var(--doc-border); padding: 8px 12px; }
  th { background: var(--doc-panel); }
  blockquote { border-left: 3px solid var(--doc-accent); margin-left: 0; padding: .55em 1em; color: var(--doc-muted); background: color-mix(in srgb, var(--doc-accent) 5%, transparent); }
  pre { background: var(--doc-panel); border: 1px solid var(--doc-border); padding: 1em; border-radius: var(--doc-radius); overflow-x: auto; }
  pre code.hljs { background: transparent; padding: 0; }
  .hljs-comment, .hljs-quote { color: #6e7781; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-doctag, .hljs-deletion { color: #cf222e; }
  .hljs-string, .hljs-regexp, .hljs-addition { color: #0a3069; }
  .hljs-number, .hljs-literal, .hljs-symbol, .hljs-attr, .hljs-attribute, .hljs-property, .hljs-params { color: #0550ae; }
  .hljs-title, .hljs-function, .hljs-section, .hljs-name, .hljs-tag, .hljs-meta { color: #8250df; }
  .hljs-type, .hljs-built_in, .hljs-variable, .hljs-template-variable { color: #953800; }
  .hljs-operator { color: #57606a; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
  :not(pre) > code { background: var(--doc-panel); border-radius: 4px; padding: .14em .4em; }
  a { color: var(--doc-accent); }
  mark { background: var(--doc-mark); padding: 0 2px; }
  .mermaid { text-align: center; margin: 1em 0; }
  .footnotes { font-size: 0.9em; color: var(--doc-muted); border-top: 1px solid var(--doc-border); margin-top: 2em; padding-top: 1em; }
  .contains-task-list { list-style: none; padding-left: 1.4em; }
  .task-list-item > input[type="checkbox"] { margin: 0 .45em 0 -1.35em; accent-color: var(--doc-accent); }
`;

const DARK_CSS = `
  :root { --doc-bg: #181a1f; --doc-fg: #e6e9ee; --doc-muted: #aab1bc; --doc-border: #3b414a; --doc-accent: #78a9ff; --doc-panel: #22252b; --doc-mark: #554b20; }
`;

function markdownThemeCss(theme: MarkdownTheme, colorTheme: ResolvedTheme): string {
  const dark = colorTheme === "dark";
  switch (theme) {
    case "pixyll":
      return dark
        ? `:root { --doc-bg:#1e2024; --doc-fg:#dde1e7; --doc-muted:#9aa1ad; --doc-border:#555c68; --doc-accent:#a6b8e0; --doc-panel:#23262c; --doc-radius:0px; --doc-heading:"Lato","Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif; }
          body { font-family:"Merriweather","PT Serif",Georgia,"Songti SC","SimSun",serif; line-height:1.8; max-width:1160px; }
          h1 { font-size:2.65em; font-weight:800; color:#f2f4f7; }
          h2 { font-size:1.72em; font-weight:700; color:#f2f4f7; }
          a { color:#a6b8e0; text-decoration:underline; }
          :not(pre) > code { background:transparent; color:#a8b1bf; padding:0 2px; border-radius:0; }
          pre { border:1px solid #555c68; border-radius:0; }
          blockquote { border-left:5px solid #7d8594; background:transparent; font-style:italic; color:#adb4c0; }
          th,td { border:0; padding:12px; text-align:left; }
          thead th { background:transparent; font-family:var(--doc-heading); border-bottom:2px solid #cfd5df; color:#f2f4f7; }
          tbody td { border-top:1px solid #4d535e; }
          tbody tr:first-child td { border-top:0; }`
        : `:root { --doc-bg:#ffffff; --doc-fg:#333333; --doc-muted:#7a7a7a; --doc-border:#7a7a7a; --doc-accent:#463f5c; --doc-panel:#ffffff; --doc-radius:0px; --doc-heading:"Lato","Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif; }
          body { font-family:"Merriweather","PT Serif",Georgia,"Songti SC","SimSun",serif; line-height:1.8; max-width:1160px; }
          h1 { font-size:2.65em; font-weight:800; color:#333333; }
          h2 { font-size:1.72em; font-weight:700; color:#333333; }
          a { color:#463f5c; text-decoration:underline; }
          :not(pre) > code { background:transparent; color:#7a7a7a; padding:0 2px; border-radius:0; }
          pre { background:#ffffff; border:1px solid #7a7a7a; border-radius:0; }
          blockquote { border-left:5px solid #7a7a7a; background:transparent; font-style:italic; color:#555555; }
          th,td { border:0; padding:12px; text-align:left; }
          thead th { background:transparent; font-family:var(--doc-heading); border-bottom:2px solid #333333; color:#333333; }
          tbody td { border-top:1px solid #9a9a9a; }
          tbody tr:first-child td { border-top:0; }`;
    case "newsprint":
      return dark
        ? `:root { --doc-bg:#201e1c; --doc-fg:#e2dcd2; --doc-muted:#a39b8e; --doc-border:#47423c; --doc-accent:#74b0d9; --doc-panel:#2d2926; --doc-radius:0px; --doc-heading:"PT Serif","Times New Roman","Songti SC","SimSun",serif; }
          body { font-family:var(--doc-heading); line-height:1.65; max-width:1040px; }
          h1 { font-weight:400; border-bottom:1px solid var(--doc-border); padding-bottom:0.5em; }
          blockquote { border-left:5px solid #6e675d; background:transparent; font-style:italic; }
          th,td { border:0; padding:6px 10px; }
          thead th { background:#36322d; }
          tbody tr:nth-child(2n) td { background:#2a2723; }
          :not(pre) > code { background:#35312c; border-radius:0; }`
        : `:root { --doc-bg:#f3f2ee; --doc-fg:#1f0909; --doc-muted:#656565; --doc-border:#c5c5c5; --doc-accent:#065588; --doc-panel:#dadada; --doc-radius:0px; --doc-heading:"PT Serif","Times New Roman","Songti SC","SimSun",serif; }
          body { font-family:var(--doc-heading); line-height:1.65; max-width:1040px; }
          h1 { font-weight:400; border-bottom:1px solid var(--doc-border); padding-bottom:0.5em; }
          blockquote { border-left:5px solid #bababa; background:transparent; font-style:italic; color:#656565; }
          th,td { border:0; padding:6px 10px; }
          thead th { background:#dadada; }
          tbody tr:nth-child(2n) td { background:#e8e7e7; }
          :not(pre) > code { background:#dadada; border-radius:0; }
          pre { border:0; border-radius:0; }`;
    case "whitey":
      return dark
        ? `:root { --doc-bg:#1c1d1f; --doc-fg:#dcdfe4; --doc-muted:#9aa0a8; --doc-border:#3b3f45; --doc-accent:#5cb0e5; --doc-panel:#242629; --doc-radius:0px; --doc-heading:"Vollkorn",Palatino,Georgia,"Songti SC","SimSun",serif; }
          body { font-family:var(--doc-heading); max-width:1040px; }
          h1,h2,h3 { text-align:center; font-weight:400; }
          h3 { font-style:italic; }
          h2::after { content:""; display:block; width:100px; height:1px; margin:0.4em auto 0; background:#9aa0a8; }
          blockquote { background:transparent; border-left:1px solid #4b5058; }
          th,td { border:0; border-top:1px solid #353940; }
          thead th { background:transparent; border-top:0; border-bottom:1px solid #3f444b; }`
        : `:root { --doc-bg:#fefefe; --doc-fg:#333333; --doc-muted:#777777; --doc-border:#dddddd; --doc-accent:#2484c1; --doc-panel:#ffffff; --doc-radius:0px; --doc-heading:"Vollkorn",Palatino,Georgia,"Songti SC","SimSun",serif; }
          body { font-family:var(--doc-heading); max-width:1040px; }
          h1,h2,h3 { text-align:center; font-weight:400; }
          h3 { font-style:italic; }
          h2::after { content:""; display:block; width:100px; height:1px; margin:0.4em auto 0; background:#2f2f2f; }
          blockquote { background:transparent; border-left:1px solid #dddddd; }
          th,td { border:0; border-top:1px solid #dddddd; }
          thead th { background:transparent; border-top:0; border-bottom:1px solid #dddddd; }`;
    case "night":
      return `:root { --doc-bg:#363b40; --doc-fg:#b8bfc6; --doc-muted:#9da2a6; --doc-border:#474d54; --doc-accent:#e0e0e0; --doc-panel:#333333; --doc-radius:0px; }
          body { max-width:1100px; }
          h1,h2,h3 { color:#dedede; }
          h1 { font-weight:400; }
          a { color:#e0e0e0; text-decoration:underline; }
          blockquote { background:transparent; border-left:2px solid #474d54; color:#9da2a6; }
          th { background:transparent; color:#dedede; }
          pre { border:0; border-radius:0; }`;
    case "lapis":
      return dark
        ? `:root { --doc-bg:#191e26; --doc-fg:#d9e1ec; --doc-muted:#8f9eb3; --doc-border:#313b4c; --doc-accent:#7aa2f7; --doc-panel:#212834; --doc-radius:8px; }
          h1,h2,h3 { color:#7ea8e6; }
          h2 { border-left:4px solid var(--doc-accent); padding-left:10px; }`
        : `:root { --doc-bg:#ffffff; --doc-fg:#2b323b; --doc-muted:#647182; --doc-border:#dce4ef; --doc-accent:#446ca3; --doc-panel:#f3f6fa; --doc-radius:8px; }
          h1,h2,h3 { color:#36598a; }
          h2 { border-left:4px solid var(--doc-accent); padding-left:10px; }`;
    case "sepia":
      return dark
        ? `:root { --doc-bg:#221e1a; --doc-fg:#e5dcd0; --doc-muted:#a69989; --doc-border:#403830; --doc-accent:#d9915b; --doc-panel:#2b2621; --doc-radius:6px; --doc-heading:"Georgia","Songti SC","Noto Serif SC","SimSun",serif; }
          body { font-family:var(--doc-heading); line-height:1.85; }`
        : `:root { --doc-bg:#faf6ee; --doc-fg:#3a3026; --doc-muted:#7c6d5c; --doc-border:#dfd5c3; --doc-accent:#a84b31; --doc-panel:#f1eadc; --doc-radius:6px; --doc-heading:"Georgia","Songti SC","Noto Serif SC","SimSun",serif; }
          body { font-family:var(--doc-heading); line-height:1.85; }`;
    case "nord":
      return dark
        ? `:root { --doc-bg:#2e3440; --doc-fg:#eceff4; --doc-muted:#9aa7bd; --doc-border:#434c5e; --doc-accent:#88c0d0; --doc-panel:#3b4252; --doc-radius:7px; }
          h1,h2,h3 { color:#88c0d0; }`
        : `:root { --doc-bg:#f6f8fb; --doc-fg:#2e3440; --doc-muted:#616e88; --doc-border:#d8dee9; --doc-accent:#5e81ac; --doc-panel:#eceff4; --doc-radius:7px; }`;
    case "academic":
      return dark
        ? `:root { --doc-bg:#1a1b1d; --doc-fg:#e2e2df; --doc-muted:#9e9e99; --doc-border:#3a3b40; --doc-accent:#7aa7dc; --doc-panel:#232427; --doc-radius:2px; --doc-heading:"STIX Two Text","Cambria","Georgia","Songti SC","SimSun",serif; }
          body { font-family:var(--doc-heading); line-height:1.85; }
          h1 { text-align:center; border-bottom:1px solid var(--doc-border); padding-bottom:0.35em; }
          table { border-top:2px solid #f4f4f0; border-bottom:2px solid #f4f4f0; }
          th,td { border:0; padding:8px 14px; }
          th { background:transparent; border-bottom:1px solid #f4f4f0; }`
        : `:root { --doc-bg:#ffffff; --doc-fg:#1a1a1a; --doc-muted:#595959; --doc-border:#d9d9d5; --doc-accent:#1d4e89; --doc-panel:#f7f7f5; --doc-radius:2px; --doc-heading:"STIX Two Text","Cambria","Georgia","Songti SC","SimSun",serif; }
          body { font-family:var(--doc-heading); line-height:1.85; }
          h1 { text-align:center; border-bottom:1px solid var(--doc-border); padding-bottom:0.35em; }
          table { border-top:2px solid #111111; border-bottom:2px solid #111111; }
          th,td { border:0; padding:8px 14px; }
          th { background:transparent; border-bottom:1px solid #111111; }`;
    case "vue":
      return dark
        ? `:root { --doc-border:#3a3a3a; --doc-accent:#42d392; --doc-panel:#242424; --doc-radius:4px; }`
        : `:root { --doc-border:#e2e2e3; --doc-accent:#42b883; --doc-panel:#f3f5f7; --doc-radius:4px; }`;
    case "minimal":
      return dark
        ? `:root { --doc-border:#343939; --doc-accent:#9aacaa; --doc-panel:#242727; --doc-radius:2px; }`
        : `:root { --doc-border:#e0e5e4; --doc-accent:#647a76; --doc-panel:#f5f7f7; --doc-radius:2px; }`;
    default:
      return "";
  }
}

/** 允许常用排版标签，同时剔除 script、事件属性和危险 URL。 */
const SANITIZE_SCHEMA: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...(defaultSchema.tagNames ?? []), ...HTML_INLINE_TAGS, ...HTML_BLOCK_TAGS])],
  strip: [...new Set([...(defaultSchema.strip ?? []), ...HTML_STRIP_TAGS])],
  protocols: { ...defaultSchema.protocols, href: HTML_LINK_PROTOCOLS, src: HTML_IMAGE_PROTOCOLS },
  attributes: {
    ...defaultSchema.attributes,
    details: ["open"],
    img: [...(defaultSchema.attributes?.img ?? []), ["width", HTML_IMAGE_SIZE], ["height", HTML_IMAGE_SIZE]],
  },
};

function rehypeHighlightMarks() {
  const skip = new Set(["code", "pre", "script", "style"]);
  const transform = (node: any) => {
    if (!Array.isArray(node.children) || skip.has(node.tagName)) return;
    const children: any[] = [];
    for (const child of node.children) {
      if (child.type !== "text" || typeof child.value !== "string") {
        transform(child);
        children.push(child);
        continue;
      }
      const re = /==([^=\n]+?)==/g;
      let from = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(child.value))) {
        if (match.index > from) children.push({ type: "text", value: child.value.slice(from, match.index) });
        children.push({
          type: "element",
          tagName: "mark",
          properties: {},
          children: [{ type: "text", value: match[1] }],
        });
        from = match.index + match[0].length;
      }
      if (from === 0) children.push(child);
      else if (from < child.value.length) children.push({ type: "text", value: child.value.slice(from) });
    }
    node.children = children;
  };
  return transform;
}

const HTML_UNESCAPE: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
};

function unescapeHtml(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (m) => HTML_UNESCAPE[m] ?? m);
}

let mermaidId = 0;

/**
 * 导出时把 Mermaid 直接渲染成内联 SVG。
 *
 * 之前是往导出文件里塞一段从 CDN 拉 mermaid 的 <script type="module">：
 * 离线打不开，PDF 打印也依赖网络，而且要求页面允许内联脚本。
 */
async function renderMermaidBlocks(html: string, theme: ResolvedTheme): Promise<string> {
  const re = /<pre><code class="[^"]*language-mermaid[^"]*">([\s\S]*?)<\/code><\/pre>/gi;
  const blocks: Array<{ match: string; code: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    blocks.push({ match: m[0], code: unescapeHtml(m[1]) });
  }
  if (!blocks.length) return html;

  const wanted = theme === "dark" ? "dark" : "neutral";
  const mermaid = await configuredMermaid(wanted);

  let out = html;
  for (const block of blocks) {
    try {
      const { svg } = await mermaid.render(`export-mmd-${++mermaidId}`, block.code);
      out = out.replace(block.match, () => `<div class="mermaid">${svg}</div>`);
    } catch {
      /* 渲染失败保留原始代码块 */
    }
  }
  return out;
}
async function buildProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    .use(rehypeHighlightMarks)
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeStringify);
}

export async function markdownToBodyHtml(
  md: string,
  theme: ResolvedTheme = "light",
): Promise<string> {
  const processor = await buildProcessor();
  const result = await processor.process(md);
  return renderMermaidBlocks(String(result), theme);
}

export async function markdownToHtml(
  md: string,
  theme: ResolvedTheme,
  locale: Locale = "zh",
  mdPath?: string | null,
  embedImages = false,
  markdownTheme: MarkdownTheme = "github",
  pendingImages: ReadonlyMap<string, string> = new Map(),
): Promise<string> {
  let bodyHtml = await markdownToBodyHtml(md, theme);
  if (embedImages) {
    bodyHtml = await embedImagesInHtml(bodyHtml, mdPath ?? null, pendingImages);
  }
  const exportKatexCss = embedImages ? await embedFontUrlsInCss(katexCss) : katexCss;
  const themeCss = `${theme === "dark" ? DARK_CSS : ""}${markdownThemeCss(markdownTheme, theme)}`;
  const lang = locale === "zh" ? "zh-CN" : "en";
  const title = (mdPath?.split(/[\\/]/).pop() || "InkNote")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data: https: http:; style-src 'unsafe-inline'; font-src data:;" />
  <title>${title}</title>
  <style>${exportKatexCss}</style>
  <style>${BASE_CSS}${themeCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let embeddedKatexCss: Promise<string> | null = null;

function embedFontUrlsInCss(css: string): Promise<string> {
  if (embeddedKatexCss) return embeddedKatexCss;
  embeddedKatexCss = (async () => {
    const woff2Only = css.replace(
      /src:\s*(url\([^)]*\.woff2\)\s*format\(["']woff2["']\))[^;}]*;/g,
      "src:$1;",
    );
    const urls = [...new Set(
      [...woff2Only.matchAll(/url\((?:["'])?([^"')]+)(?:["'])?\)/g)].map((match) => match[1]),
    )];
    const dataUrls = await Promise.all(urls.map((url) => urlToDataUrl(url)));
    return urls.reduce(
      (result, url, index) => dataUrls[index] ? result.split(url).join(dataUrls[index]!) : result,
      woff2Only,
    );
  })();
  return embeddedKatexCss;
}

async function fileToDataUrl(absPath: string): Promise<string | null> {
  return urlToDataUrl(convertFileSrc(absPath));
}

function pendingImageDataUrl(
  pendingImages: ReadonlyMap<string, string>,
  source: string,
): string | null {
  const normalized = source.replace(/^\.\//, "");
  const decoded = (() => {
    try { return decodeURIComponent(normalized); } catch { return normalized; }
  })();
  return pendingImages.get(source)
    ?? pendingImages.get(normalized)
    ?? pendingImages.get(decoded)
    ?? null;
}

export async function embedImagesInHtml(
  html: string,
  mdPath: string | null,
  pendingImages: ReadonlyMap<string, string> = new Map(),
): Promise<string> {
  const re = /<img([^>]*)\ssrc="([^"]+)"([^>]*)>/gi;
  const parts: Array<{ match: string; src: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    parts.push({ match: m[0], src: m[2] });
  }
  let out = html;
  for (const { match, src } of parts) {
    if (src.startsWith("data:") || src.startsWith("//") || /^https?:/i.test(src)) continue;
    const pendingDataUrl = pendingImageDataUrl(pendingImages, src);
    if (pendingDataUrl) {
      out = out.replace(match, match.replace(src, pendingDataUrl));
      continue;
    }
    if (!mdPath) continue;
    const abs = resolveAssetPath(mdPath, src);
    const dataUrl = await fileToDataUrl(abs);
    if (dataUrl) {
      out = out.replace(match, match.replace(src, dataUrl));
    }
  }
  return out;
}
