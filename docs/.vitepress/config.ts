import { defineConfig } from "vitepress";

import typedocSidebar from "../api/typedoc-sidebar.json";

// TypeDoc names modules after entry-point files; show package entry points
const ENTRY_POINT_LABELS: Record<string, string> = {
  index: "threadiverse",
  testing: "threadiverse/testing",
};

const apiSidebar = typedocSidebar.map((module) => ({
  ...module,
  collapsed: false,
  text: ENTRY_POINT_LABELS[module.text] ?? module.text,
}));

export default defineConfig({
  base: "/threadiverse/",
  cleanUrls: true,
  description:
    "Unified typescript client for threadiverse instances (Lemmy, PieFed, Mbin etc)",
  // repo-internal docs, not part of the published site
  srcExclude: ["internal/**"],
  // eslint-disable-next-line perfectionist/sort-objects
  head: [
    [
      "link",
      { href: "/threadiverse/logo.jpg", rel: "icon", type: "image/jpeg" },
    ],
  ],
  themeConfig: {
    editLink: {
      pattern: "https://github.com/aeharding/threadiverse/edit/main/docs/:path",
    },
    footer: {
      copyright: "AGPL-3.0-only · Alexander Harding",
    },
    logo: "/logo.jpg",
    nav: [
      { link: "/guide/getting-started", text: "Guide" },
      { link: "/guide/testing", text: "Testing" },
      { link: "/api/", text: "API Reference" },
    ],
    // level 3 so class members (methods, accessors) are browsable per-page
    outline: { level: [2, 3] },
    search: { provider: "local" },
    sidebar: {
      "/api/": [{ items: apiSidebar, text: "API Reference" }],
      "/guide/": [
        {
          items: [
            { link: "/guide/getting-started", text: "Getting Started" },
            { link: "/guide/client", text: "Using the Client" },
          ],
          text: "Guide",
        },
        {
          items: [{ link: "/guide/testing", text: "Fake Instances" }],
          text: "Testing Your App",
        },
        {
          items: [{ link: "/api/", text: "Overview" }],
          text: "API Reference",
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/aeharding/threadiverse" },
      { icon: "npm", link: "https://www.npmjs.com/package/threadiverse" },
    ],
  },
  title: "threadiverse",
});
