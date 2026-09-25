// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * The Lovable/TanStack devtools plugin injects a `data-tsd-source` attribute
 * onto every JSX opening element for click-to-source. react-three-fiber tries
 * to apply that attribute onto three.js objects (which have no `data` prop),
 * throwing: `R3F: Cannot set "data-tsd-source"`. That injection is hardcoded
 * on with no ignore hook, so we strip the attribute AFTER injection — but only
 * in modules that use react-three-fiber / three, where intrinsic elements like
 * <mesh> / <group> are three primitives, not DOM. Regular DOM files keep their
 * source tags intact.
 */
function stripR3FSourceTags(): Plugin {
  return {
    name: "strip-r3f-source-tags",
    enforce: "post",
    transform(code, id) {
      if (!/\.[jt]sx$/.test(id)) return null;
      if (!/data-tsd-source/.test(code)) return null;
      if (!/@react-three\/fiber|@react-three\/drei|from ["']three["']/.test(code)) return null;
      const stripped = code.replace(/\s+data-tsd-source="[^"]*"/g, "");
      if (stripped === code) return null;
      return { code: stripped, map: null };
    },
  };
}

export default defineConfig({
  plugins: [stripR3FSourceTags()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Deploy target is HostersPK shared hosting (cPanel + Passenger, Node 22),
  // not Cloudflare Workers — overrides the wrapper's cloudflare-module default.
  // node-server emits a plain Node HTTP server (listen()-based), which is what
  // Passenger's app.js contract expects.
  //
  // TEMPORARY: while the HostersPK account is suspended, this switches to
  // the netlify preset (Netlify Functions) when NITRO_PRESET_TARGET=netlify
  // is set explicitly as a build-environment variable in Netlify's own site
  // settings — NOT auto-detected from Netlify's own NETLIFY env var, which
  // didn't reliably signal "yes, use the netlify preset" in practice on
  // Netlify's actual build servers. Explicit and self-controlled instead.
  // The HostersPK CI deploy job never sets this, so it keeps building
  // node-server exactly as before. Revert by deleting this ternary once
  // HostersPK is back.
  nitro: {
    // Truthy check, not exact-match — Netlify's build confirmed the variable
    // present in its "Resolved config" while the build itself still logged
    // `preset: node-server`, meaning the value wasn't matching "netlify"
    // exactly (near-identical to the SSH-port whitespace bug from the
    // HostersPK deploy). Any non-empty value is unambiguous here, since
    // nothing else in this project ever sets this variable at all.
    preset: process.env.NITRO_PRESET_TARGET?.trim() ? "netlify" : "node-server",
  },
  // Currently off by framework default (verified empirically: a production
  // build emits no .map files or sourceMappingURL comments). Pinned
  // explicitly so a dependency bump can't silently start shipping source
  // maps — and therefore original file paths/logic — to production without
  // anyone noticing.
  vite: {
    build: { sourcemap: false },
  },
});
