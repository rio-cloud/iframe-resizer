# Changelog

## 1.0.0 - 2026-07-23

- Rewritten as an ESM-only package for modern browsers.
- Added a React parent component compatible with React 18 and React 19.
- Added the self-contained `@rio-cloud/iframe-resizer/child` runtime.
- Replaced global resize messages with an origin-checked handshake and a dedicated `MessageChannel`.
- Added automatic observer-based resizing and bidirectional application messages.
- Added a bidirectional iframe-resizer 4.x protocol bridge for incremental parent-first or
  child-first migrations.
- Added compatibility for `checkOrigin`, `resizeFrom`, `bodyMargin`, `inPageLinks` and v4 height
  calculation methods.
- Preserved native iframe attributes such as `allow`, `srcDoc`, `sandbox`, `className` and `style`.
- Added an interactive child-to-parent height resizing demo without nested iframe scrolling.
- Added browser coverage for modern, cross-origin, legacy-v4, `srcDoc`, in-page links and growing or
  shrinking child content.
- Removed the RIO CDN dependency, CommonJS output, polyfills and legacy browser APIs.
- Removed the 0.x `url` prop and unversioned `{ height }` protocol.
