import { WidgetType, EditorView } from "@codemirror/view";
import { bindBlockBoundaryCursor, currentBlockRange, stampBlockRange } from "./blockRange";
import {
  attachBlockSelection,
  attachSourceEditing,
  caretTextOffset,
  clickedOnBlockPadding,
  makePlainTextEditable,
  setCaretOffset,
} from "./editableSource";
import hljs from "highlight.js/lib/common";
import bashBase from "highlight.js/lib/languages/bash";
import apache from "highlight.js/lib/languages/apache";
import awk from "highlight.js/lib/languages/awk";
import clojure from "highlight.js/lib/languages/clojure";
import cmake from "highlight.js/lib/languages/cmake";
import dart from "highlight.js/lib/languages/dart";
import dns from "highlight.js/lib/languages/dns";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import dos from "highlight.js/lib/languages/dos";
import elixir from "highlight.js/lib/languages/elixir";
import erlang from "highlight.js/lib/languages/erlang";
import gradle from "highlight.js/lib/languages/gradle";
import groovy from "highlight.js/lib/languages/groovy";
import haskell from "highlight.js/lib/languages/haskell";
import http from "highlight.js/lib/languages/http";
import julia from "highlight.js/lib/languages/julia";
import latex from "highlight.js/lib/languages/latex";
import lisp from "highlight.js/lib/languages/lisp";
import matlab from "highlight.js/lib/languages/matlab";
import nginx from "highlight.js/lib/languages/nginx";
import nix from "highlight.js/lib/languages/nix";
import ocaml from "highlight.js/lib/languages/ocaml";
import powershell from "highlight.js/lib/languages/powershell";
import properties from "highlight.js/lib/languages/properties";
import protobuf from "highlight.js/lib/languages/protobuf";
import scala from "highlight.js/lib/languages/scala";
import stylus from "highlight.js/lib/languages/stylus";
import verilog from "highlight.js/lib/languages/verilog";
import vim from "highlight.js/lib/languages/vim";
import { getLocale, t } from "../../lib/i18n";

const EXTRA_SHELL_BUILTINS = [
  "sudo", "docker", "podman", "kubectl", "helm", "git", "curl", "wget", "ssh",
  "scp", "rsync", "systemctl", "journalctl", "nginx", "redis-server", "redis-cli",
  "mysql", "psql", "npm", "pnpm", "yarn", "npx", "node", "python", "python3",
  "pip", "pip3", "java", "javac", "mvn", "gradle", "cargo", "rustc", "go",
  "make", "cmake", "tar", "unzip", "chmod", "chown", "mkdir", "cp", "mv", "rm",
  "ls", "cat", "head", "tail", "grep", "sed", "awk", "find", "xargs", "ps", "kill",
];

function enhancedBash(h: Parameters<typeof bashBase>[0]) {
  const grammar = bashBase(h);
  if (grammar.keywords && typeof grammar.keywords === "object" && !Array.isArray(grammar.keywords)) {
    const existing = grammar.keywords.built_in;
    if (Array.isArray(existing)) {
      grammar.keywords.built_in = [...existing, ...EXTRA_SHELL_BUILTINS];
    } else if (typeof existing === "string") {
      grammar.keywords.built_in = `${existing} ${EXTRA_SHELL_BUILTINS.join(" ")}`;
    }
  }
  if (Array.isArray(grammar.contains)) {
    grammar.contains.push(
      { className: "attr", begin: /(?:^|(?<=\s))--?[a-zA-Z][\w-]*/ },
      { className: "number", begin: /\b\d+(?:\.\d+)?(?:[kKmMgGtT][bB]?)?\b/ },
      { className: "operator", begin: /\\$/m },
    );
  }
  return grammar;
}

hljs.registerLanguage("bash", enhancedBash);

for (const [lang, mod] of [
  ["apache", apache],
  ["awk", awk],
  ["clojure", clojure],
  ["cmake", cmake],
  ["dart", dart],
  ["dns", dns],
  ["dockerfile", dockerfile],
  ["dos", dos],
  ["elixir", elixir],
  ["erlang", erlang],
  ["gradle", gradle],
  ["groovy", groovy],
  ["haskell", haskell],
  ["http", http],
  ["julia", julia],
  ["latex", latex],
  ["lisp", lisp],
  ["matlab", matlab],
  ["nginx", nginx],
  ["nix", nix],
  ["ocaml", ocaml],
  ["powershell", powershell],
  ["properties", properties],
  ["protobuf", protobuf],
  ["scala", scala],
  ["stylus", stylus],
  ["verilog", verilog],
  ["vim", vim],
] as const) {
  if (!hljs.getLanguage(lang)) hljs.registerLanguage(lang, mod);
}

hljs.registerAliases(["sh", "shell", "zsh"], { languageName: "bash" });
hljs.registerAliases(["docker"], { languageName: "dockerfile" });
hljs.registerAliases(["ps", "ps1", "pwsh"], { languageName: "powershell" });
hljs.registerAliases(["bat", "cmd"], { languageName: "dos" });
hljs.registerAliases(["env", "dotenv", "conf"], { languageName: "properties" });
hljs.registerAliases(["nginxconf"], { languageName: "nginx" });
hljs.registerAliases(["proto"], { languageName: "protobuf" });
hljs.registerAliases(["tex"], { languageName: "latex" });
hljs.registerAliases(["toml"], { languageName: "ini" });
hljs.registerAliases(["vue", "svelte"], { languageName: "xml" });

/** 语言下拉里的候选项（覆盖常用前后端、脚本与运维配置语言） */
export const LANGUAGE_OPTIONS = [
  "", "bash", "c", "cmake", "cpp", "csharp", "css", "dart", "diff", "dockerfile",
  "dos", "go", "gradle", "graphql", "groovy", "html", "http", "ini", "java",
  "javascript", "json", "kotlin", "latex", "less", "lua", "makefile", "markdown",
  "mermaid", "nginx", "objectivec", "perl", "php", "powershell", "properties",
  "protobuf", "python", "r", "ruby", "rust", "scala", "scss", "sql", "swift",
  "toml", "typescript", "xml", "yaml",
];

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cmake: "CMake",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  dart: "Dart",
  diff: "Diff",
  dockerfile: "Dockerfile",
  dos: "Batch",
  go: "Go",
  gradle: "Gradle",
  graphql: "GraphQL",
  groovy: "Groovy",
  html: "HTML",
  http: "HTTP",
  ini: "INI",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  kotlin: "Kotlin",
  latex: "LaTeX",
  less: "Less",
  lua: "Lua",
  makefile: "Makefile",
  markdown: "Markdown",
  mermaid: "Mermaid",
  nginx: "Nginx",
  objectivec: "Objective-C",
  perl: "Perl",
  php: "PHP",
  powershell: "PowerShell",
  properties: "Properties",
  protobuf: "Protobuf",
  python: "Python",
  r: "R",
  ruby: "Ruby",
  rust: "Rust",
  scala: "Scala",
  scss: "SCSS",
  sql: "SQL",
  swift: "Swift",
  toml: "TOML",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
};

function normalizeLang(info: string): string {
  const raw = info.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (raw === "tsx") return "typescript";
  if (raw === "jsx") return "javascript";
  if (raw === "sh" || raw === "shell" || raw === "zsh") return "bash";
  if (raw === "yml") return "yaml";
  if (raw === "py") return "python";
  if (raw === "js") return "javascript";
  if (raw === "ts") return "typescript";
  if (raw === "rs") return "rust";
  if (raw === "rb") return "ruby";
  if (raw === "kt") return "kotlin";
  if (raw === "cs") return "csharp";
  if (raw === "md") return "markdown";
  if (raw === "docker") return "dockerfile";
  if (raw === "ps1" || raw === "pwsh" || raw === "ps") return "powershell";
  if (raw === "bat" || raw === "cmd") return "dos";
  if (raw === "proto") return "protobuf";
  if (raw === "tex") return "latex";
  return raw;
}

function langLabel(lang: string): string {
  return LANGUAGE_LABELS[lang] ?? (lang || t(getLocale(), "editor.code.plainText"));
}

/** 把代码写进元素并上色；keepCaret 用于输入过程中保持光标不跳 */
function paintCode(codeEl: HTMLElement, code: string, lang: string, keepCaret: boolean) {
  const normalized = normalizeLang(lang);
  const offset = keepCaret ? caretTextOffset(codeEl) : null;

  if (normalized && hljs.getLanguage(normalized)) {
    codeEl.innerHTML = hljs.highlight(code, { language: normalized }).value;
    codeEl.className = `hljs language-${normalized}`;
  } else {
    codeEl.textContent = code;
    codeEl.className = "hljs";
  }

  // 保留末尾空行的可见光标位置，占位符不属于代码内容。
  if (!code || code.endsWith("\n")) {
    const end = document.createElement("br");
    end.setAttribute("data-code-end", "");
    codeEl.appendChild(end);
  }

  if (offset != null) setCaretOffset(codeEl, offset);
}

function paintGutter(gutter: HTMLElement, code: string) {
  const lines = code.split("\n").length;
  let text = "";
  for (let i = 1; i <= lines; i++) text += (i > 1 ? "\n" : "") + i;
  if (gutter.textContent !== text) gutter.textContent = text;
}

export class CodeBlockWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly code: string,
    readonly lang: string,
    readonly indented = false,
  ) {
    super();
  }

  /** 只比较内容与长度：位置变化不应触发重新高亮 */
  eq(other: CodeBlockWidget) {
    return (
      other.to - other.from === this.to - this.from &&
      other.code === this.code &&
      other.lang === this.lang &&
      other.indented === this.indented
    );
  }

  private serialize(code: string, lang: string): string {
    if (this.indented && !lang.trim()) {
      return code.replace(/\n+$/, "").split("\n").map((line) => `    ${line}`).join("\n");
    }
    return `\`\`\`${lang.trim()}\n${code}\n\`\`\``;
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "md-codeblock-widget";
    stampBlockRange(wrap, this.from, this.to);

    // 外层只负责纵向留白，视觉盒子放内层：根元素带 margin 会让
    // CodeMirror 的高度图算不准（rect 不含外边距）
    const box = document.createElement("div");
    box.className = "md-codeblock-box";
    wrap.appendChild(box);

    const gutter = document.createElement("div");
    gutter.className = "md-codeblock-gutter";
    gutter.contentEditable = "false";
    paintGutter(gutter, this.code);

    const pre = document.createElement("pre");
    const codeEl = document.createElement("code");
    makePlainTextEditable(codeEl);
    paintCode(codeEl, this.code, this.lang, false);
    pre.appendChild(codeEl);

    box.appendChild(gutter);
    box.appendChild(pre);

    // 右上角只放复制；语言选择单独贴在代码块左上边缘。
    const header = document.createElement("div");
    header.className = "md-codeblock-header";
    header.contentEditable = "false";

    const languageControl = document.createElement("div");
    languageControl.className = "md-codeblock-language-control";
    languageControl.contentEditable = "false";

    const select = document.createElement("select");
    select.className = "md-codeblock-lang";
    const current = normalizeLang(this.lang);
    const options = LANGUAGE_OPTIONS.includes(current)
      ? LANGUAGE_OPTIONS
      : [...LANGUAGE_OPTIONS, current];
    for (const value of options) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = langLabel(value);
      if (value === current) opt.selected = true;
      select.appendChild(opt);
    }
    select.value = current;
    const languageLabel = document.createElement("span");
    languageLabel.className = "md-codeblock-language-label";
    languageLabel.textContent = langLabel(current);
    select.addEventListener("mousedown", (e) => e.stopPropagation());
    select.addEventListener("change", () => {
      const view = EditorView.findFromDOM(wrap);
      const range = view && currentBlockRange(view, wrap);
      if (!view || !range) return;
      if (view.state.readOnly) return;
      const code = codeEl.textContent ?? "";
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: this.serialize(code, select.value) },
        userEvent: "input.codeblock",
      });
      view.focus();
    });

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "md-codeblock-copy";
    copyBtn.textContent = t(getLocale(), "editor.code.copy");
    copyBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      void navigator.clipboard.writeText(codeEl.textContent ?? this.code);
      copyBtn.textContent = t(getLocale(), "editor.code.copied");
      window.setTimeout(() => {
        copyBtn.textContent = t(getLocale(), "editor.code.copy");
      }, 1200);
    });

    header.appendChild(copyBtn);
    languageControl.appendChild(select);
    languageControl.appendChild(languageLabel);
    box.appendChild(header);
    box.appendChild(languageControl);
    bindBlockBoundaryCursor(wrap, box);

    attachSourceEditing(wrap, {
      source: () => codeEl,
      toMarkdown: (text) => this.serialize(text, select.value),
      onInput: (text, el) => {
        paintCode(el, text, select.value, true);
        paintGutter(gutter, text);
      },
      indentOnTab: true,
      codeBlock: true,
    });

    // 点在代码区以外的盒内留白也进入编辑；外层留白不抢点击
    wrap.addEventListener("mousedown", (event) => {
      const view = EditorView.findFromDOM(wrap);
      if (view?.state.readOnly) {
        // 只读预览不进入源码编辑，但必须保留浏览器原生文本框选。
        // 点击按钮以外的代码区时不能 preventDefault，否则无法选择单词或多行。
        if (codeEl.contains(event.target as Node)) return;
        if ((event.target as HTMLElement).closest(".md-codeblock-header")) return;
        event.preventDefault();
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest(".md-codeblock-header")) return;
      if (!box.contains(target)) return;
      if (codeEl.contains(target) || target === codeEl) return;
      event.preventDefault();
      codeEl.focus();
      setCaretOffset(codeEl, (codeEl.textContent ?? "").length);
    });

    return wrap;
  }

  updateDOM(dom: HTMLElement) {
    const codeEl = dom.querySelector<HTMLElement>("code");
    const select = dom.querySelector<HTMLSelectElement>(".md-codeblock-lang");
    const gutter = dom.querySelector<HTMLElement>(".md-codeblock-gutter");
    if (!codeEl || !select || !gutter) return false;

    stampBlockRange(dom, this.from, this.to);

    const lang = normalizeLang(this.lang);
    const languageLabel = dom.querySelector<HTMLElement>(".md-codeblock-language-label");
    if (languageLabel) languageLabel.textContent = langLabel(lang);
    if (select.value !== lang) {
      if (!Array.from(select.options).some((o) => o.value === lang)) {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = langLabel(lang);
        select.appendChild(opt);
      }
      select.value = lang;
    }

    // 正在输入的元素不能重写，否则光标会被打掉
    if (document.activeElement !== codeEl && (codeEl.textContent ?? "") !== this.code) {
      paintCode(codeEl, this.code, this.lang, false);
      paintGutter(gutter, this.code);
    }
    return true;
  }

  /** 组件内交互自理；点在外层留白上的鼠标事件交还编辑器定位光标 */
  ignoreEvent(event: Event) {
    return !clickedOnBlockPadding(event, "md-codeblock-widget");
  }
}

export class HrWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }

  eq(other: HrWidget) {
    return other.to - other.from === this.to - this.from;
  }

  toDOM() {
    const hr = document.createElement("div");
    hr.className = "md-hr-widget";
    hr.setAttribute("role", "separator");
    stampBlockRange(hr, this.from, this.to);

    const line = document.createElement("span");
    line.className = "md-hr-line";
    line.setAttribute("aria-hidden", "true");
    hr.appendChild(line);

    // 分割线上下的视觉留白跳过已折叠源码空行，落到相邻可见段落。
    bindBlockBoundaryCursor(hr, line);
    attachBlockSelection(hr);
    return hr;
  }

  updateDOM(dom: HTMLElement) {
    stampBlockRange(dom, this.from, this.to);
    return true;
  }

  ignoreEvent() {
    return true;
  }
}
