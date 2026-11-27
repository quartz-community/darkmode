import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuartzComponentProps } from "@quartz-community/types";
import { Darkmode } from "../src/index";
import { renderToHtml } from "./render";
import { fakeDom } from "./fakeDom";
import { bundleInline, runInline } from "./inlineScript";

const SCRIPT = new URL("../src/components/scripts/darkmode.inline.ts", import.meta.url).pathname;

// Quartz's bundler turns the inline import into the script's source; do the same here
vi.mock("../src/components/scripts/darkmode.inline.ts", async () => {
  const { bundleInline } = await import("./inlineScript");
  return {
    default: await bundleInline(
      new URL("../src/components/scripts/darkmode.inline.ts", import.meta.url).pathname,
    ),
  };
});

const render = (props: Partial<QuartzComponentProps>) =>
  renderToHtml(Darkmode()({ cfg: {}, ...props } as QuartzComponentProps));

describe("Darkmode component", () => {
  it("renders a toggle button with day and night icons, labelled in the site locale", () => {
    const html = render({ displayClass: "desktop-only" });
    expect(html).toMatch(/^<button class="desktop-only darkmode" aria-label="Dark mode">/);
    expect(html).toContain('class="dayIcon"');
    expect(html).toContain('class="nightIcon"');
    expect(html).toContain("<title>Dark mode</title>");
    expect(html).toContain("<title>Light mode</title>");

    const de = render({ cfg: { locale: "de-DE" } as QuartzComponentProps["cfg"] });
    expect(de).toContain('aria-label="Dunkler Modus"');
    expect(de).toContain("<title>Heller Modus</title>");
  });

  it("falls back to English for an unknown locale", () => {
    expect(render({ cfg: { locale: "xx-XX" } as QuartzComponentProps["cfg"] })).toContain(
      'aria-label="Dark mode"',
    );
  });

  it("ships its script before the DOM loads (no flash of the wrong theme) and its CSS", () => {
    const component = Darkmode();
    expect(component.beforeDOMLoaded).toContain("saved-theme");
    expect(component.afterDOMLoaded).toBeUndefined();
    expect(typeof component.css).toBe("string");
  });
});

describe("darkmode script", () => {
  let script: string;
  beforeEach(async () => {
    script ??= await bundleInline(SCRIPT);
  });
  afterEach(() => vi.unstubAllGlobals());
  const load = async () => runInline(script);

  it("starts from the saved theme, else the system preference", async () => {
    const saved = fakeDom({
      buttonClass: "darkmode",
      stored: { theme: "light" },
      prefersDark: true,
    });
    await load();
    expect(saved.attributes.get("saved-theme")).toBe("light");

    const system = fakeDom({ buttonClass: "darkmode", prefersDark: true });
    await load();
    expect(system.attributes.get("saved-theme")).toBe("dark");
    system.nav();
    expect([...system.bodyClasses]).toEqual(["theme-dark"]);
  });

  it("toggles the theme on click, remembers it and announces it", async () => {
    const dom = fakeDom({ buttonClass: "darkmode", stored: { theme: "light" } });
    await load();
    dom.nav();
    const events: string[] = [];
    dom.document.addEventListener("themechange", (e) =>
      events.push((e as CustomEvent<{ theme: string }>).detail.theme),
    );

    dom.click();
    expect(dom.attributes.get("saved-theme")).toBe("dark");
    expect(dom.store.get("theme")).toBe("dark");
    expect([...dom.bodyClasses]).toEqual(["theme-dark"]);
    dom.click();
    expect(dom.attributes.get("saved-theme")).toBe("light");
    expect([...dom.bodyClasses]).toEqual(["theme-light"]);
    expect(events).toEqual(["dark", "light"]);
  });

  it("follows a change of the system colour scheme", async () => {
    const dom = fakeDom({ buttonClass: "darkmode", stored: { theme: "light" } });
    await load();
    dom.nav();
    dom.darkQuery.matches = true;
    dom.darkQuery.dispatchEvent(Object.assign(new Event("change"), { matches: true }));
    expect(dom.attributes.get("saved-theme")).toBe("dark");
    expect([...dom.bodyClasses]).toEqual(["theme-dark"]);
  });

  it("toggles once per click after several SPA navigations", async () => {
    const dom = fakeDom({ buttonClass: "darkmode", stored: { theme: "light" } });
    await load();
    dom.nav();
    dom.nav(); // an even number of stale listeners would cancel out
    dom.click();
    expect(dom.attributes.get("saved-theme")).toBe("dark");
  });

  // bug: the script sets up on both `nav` and `render`, adding another click listener each time
  // without removing the first. encrypted-pages dispatches `render` after unlocking a page (and
  // after patching the content index on every page once a password is cached), so a click then
  // toggles twice: the theme button does nothing until the next navigation.
  it.fails("toggles once per click after a `render` event (encrypted page unlocked)", async () => {
    const dom = fakeDom({ buttonClass: "darkmode", stored: { theme: "light" } });
    await load();
    dom.nav();
    dom.render();
    dom.click();
    expect(dom.attributes.get("saved-theme")).toBe("dark");
  });
});
