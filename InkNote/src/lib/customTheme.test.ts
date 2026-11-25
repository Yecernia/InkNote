import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCustomCssToHost, setCustomCssPath } from "./customTheme";
import { resetSettingsStoreForTests } from "./settingsStore";

const THEMES_DIR = resolve(process.cwd(), "..", "themes");

vi.mock("./tauri", () => ({
  readFile: vi.fn((path: string) => Promise.resolve(readFileSync(path, "utf8"))),
}));

describe("Standalone custom CSS themes", () => {
  beforeEach(() => {
    resetSettingsStoreForTests();
    document.body.replaceChildren();
  });

  it("parses and scopes every standalone theme stylesheet without fallback errors", async () => {
    const cssFiles = readdirSync(THEMES_DIR).filter((name) => name.endsWith(".css"));
    expect(cssFiles).toContain("pixyll.css");
    expect(cssFiles).toContain("newsprint.css");
    expect(cssFiles).toContain("whitey.css");
    expect(cssFiles).toContain("night.css");

    for (const file of cssFiles) {
      const host = document.createElement("div");
      host.className = "editor-host";
      document.body.appendChild(host);
      setCustomCssPath(resolve(THEMES_DIR, file));
      applyCustomCssToHost(host);

      await vi.waitFor(() => {
        const style = host.querySelector("#mdnote-custom-css");
        expect(style?.textContent?.length).toBeGreaterThan(200);
      });

      const cssText = host.querySelector("#mdnote-custom-css")?.textContent ?? "";
      expect(cssText).not.toContain("could not parse");
      expect(cssText).toContain("html[data-md-theme] .editor-host.editor-host");
      expect(cssText).toContain(".md-table-widget");
    }
  });
});
