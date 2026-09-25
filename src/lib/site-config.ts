// Whether the public site is allowed to be indexed by search engines.
//
// Set to `true` before real launch — currently `false` because faculty
// figures, testimonials, and similar content are still illustrative
// placeholders, not real, and shouldn't get indexed/cached while they are.
// See "Before going live" in docs/SETUP.md.
//
// Single switch, checked once in src/routes/__root.tsx. Dashboard routes
// (src/routes/dashboard.tsx) carry their own hardcoded `noindex` unrelated
// to this flag — that one stays permanent regardless, since Mission Control
// should never be indexed even after real launch.
export const SITE_INDEXABLE = false;
