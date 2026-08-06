# Changelog

## 1.1.1 - 2026-08-06

- Restore `direction='vertical'` as the default, matching iframe-resizer 4.x behavior. Applications that need the
  child-reported width can opt in with `direction='both'`.

## 1.1.0 - 2026-08-05

- Re-request iframe dimensions when an initially hidden iframe becomes visible, matching the
  automatic visibility handling of iframe-resizer 4.x for both modern and legacy children.
- Resize both dimensions by default so child-reported widths work without additional parent props.
- Keep the React `title` prop optional and default it to `iframe`, matching the previous wrapper API.

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
