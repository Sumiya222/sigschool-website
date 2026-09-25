import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";

import appCss from "../styles.css?url";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ImmersiveBackground } from "@/components/immersive/ImmersiveBackground";
import { Preloader } from "@/components/Preloader";
import { getSiteContent } from "@/lib/site-content.functions";
import { SiteContentContext } from "@/lib/site-content";
import { CampRegistrationProvider } from "@/components/camp/CampRegistrationProvider";
import { CampAnnouncementBar } from "@/components/camp/CampAnnouncementBar";
import { reportClientError } from "@/lib/client-error-report.functions";
import { SITE_INDEXABLE } from "@/lib/site-config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gold">404</h1>
        <h2 className="mt-4 font-display text-subheading font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-small text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-gold px-5 py-2.5 text-small font-semibold text-navy-950 transition-colors hover:bg-gold-bright"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const report = useServerFn(reportClientError);

  useEffect(() => {
    // Explicit fields rather than `console.error(error)` — that dumps
    // whatever the thrown value happens to carry, an unbounded surface if
    // some future code ever attaches extra context to an Error or
    // interpolates user data into its message. This logs only name +
    // message, which is virtually always engine/library-generated text.
    console.error("[dashboard] Unhandled render error:", error.name, "—", error.message);

    // Best effort: a render crash otherwise never reaches anyone but the
    // one visitor whose browser hit it. Reported server-side (visible in
    // Cloudflare's own Workers logs) so it isn't invisible in production.
    void report({
      data: {
        name: error.name,
        message: error.message,
        stack: error.stack ?? null,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
    }).catch(() => {
      // Never let a failed report compound the original crash.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-subheading font-semibold text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-small text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-gold px-5 py-2.5 text-small font-semibold text-navy-950 transition-colors hover:bg-gold-bright"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gold/50 px-5 py-2.5 text-small font-semibold text-gold transition-colors hover:bg-gold/10"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getSiteContent(),

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Single site-wide switch — see src/lib/site-config.ts. Child routes
      // don't need to repeat this; TanStack Start merges route `head()`
      // results, so this applies everywhere it isn't overridden.
      ...(SITE_INDEXABLE ? [] : [{ name: "robots", content: "noindex, nofollow" }]),
      { title: "AstroBot Academy — Robotics, AI & Space Science for Kids" },
      {
        name: "description",
        content:
          "An immersive Mission Control experience. Hands-on Robotics, AI and Space Science programs for pre-school to Grade 8 students across Pakistan.",
      },
      { name: "author", content: "AstroBot Academy" },
      {
        property: "og:title",
        content: "AstroBot Academy — Robotics, AI & Space Science for Kids",
      },
      {
        property: "og:description",
        content:
          "An immersive Mission Control experience. Hands-on Robotics, AI and Space Science programs for pre-school to Grade 8 students across Pakistan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "AstroBot Academy — Robotics, AI & Space Science for Kids",
      },
      {
        name: "twitter:description",
        content:
          "An immersive Mission Control experience. Hands-on Robotics, AI and Space Science programs for pre-school to Grade 8 students across Pakistan.",
      },
      { property: "og:image", content: "https://astrobotacademy.com/og-image.webp" },
      { name: "twitter:image", content: "https://astrobotacademy.com/og-image.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Fallback for browsers that don't evaluate `media` on <link rel="icon">.
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      // Live-switches with the OS/browser color scheme — no JS needed.
      {
        rel: "icon",
        href: "/favicon-black.ico",
        type: "image/x-icon",
        media: "(prefers-color-scheme: light)",
      },
      {
        rel: "icon",
        href: "/favicon-white.ico",
        type: "image/x-icon",
        media: "(prefers-color-scheme: dark)",
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const siteContent = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/dashboard");

  // ImmersiveBackground and Preloader both render unconditionally, at the
  // very top and in the same position in every branch below, so React never
  // tears either of them down across a route change. This matters a lot more
  // than it looks: the /dashboard layout route is `ssr: false` (client-only),
  // and crossing that boundary combined with this component's isDashboard
  // branching was causing React to unmount/remount this whole subtree
  // repeatedly in rapid succession — which tore down ImmersiveBackground's
  // WebGL context (throwing "Context Lost") and reset Preloader before its
  // counter could ever tick, leaving it stuck at 0% until a hard reload.
  // Keeping both mounted for the whole session avoids that class of bug
  // entirely. Trade-off: the boot animation now only plays once, on the
  // very first load, rather than replaying every time you enter Mission
  // Control.
  if (isDashboard) {
    return (
      <QueryClientProvider client={queryClient}>
        <ImmersiveBackground />
        <Preloader />
        <Outlet />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ImmersiveBackground />
      <Preloader />
      <SiteContentContext.Provider value={siteContent}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <CampRegistrationProvider>
          <CampAnnouncementBar />
          <Nav />
          <main
            id="main-content"
            className="relative z-10 min-h-screen"
            style={{ paddingTop: "var(--announce-h, 0px)" }}
          >
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <Footer />
        </CampRegistrationProvider>
      </SiteContentContext.Provider>
    </QueryClientProvider>
  );
}
