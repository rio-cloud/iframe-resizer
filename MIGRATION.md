# Migration to 1.0

Version 1.0 is a complete rewrite of `@rio-cloud/iframe-resizer`. It replaces the deprecated RIO CDN
client script and can take over the resizing use cases currently covered by `iframe-resizer-react`
and `iframe-resizer`.

## Breaking changes from `@rio-cloud/iframe-resizer` 0.x

- The package is ESM-only.
- React 18 and React 19 are supported. Older React versions are not supported.
- The parent prop `url` is replaced by the native iframe prop `src`.
- `title` is required for an accessible iframe.
- The old unversioned `{ height }` global message is no longer accepted.
- The child application must import `@rio-cloud/iframe-resizer/child`.
- The connection validates the iframe window and origin, then moves communication to a private
  `MessageChannel`.
- Legacy browser polyfills and legacy-browser bundles have been removed.

Before:

```tsx
<IframeResizer url='https://embedded.example.com/' />;
```

After:

```tsx
<IframeResizer src='https://embedded.example.com/' title='Embedded application' />;
```

Add this once to the embedded application:

```ts
import '@rio-cloud/iframe-resizer/child';
```

The original `@rio-cloud/iframe-resizer` 0.x `{ height }` protocol is not supported. This is separate
from the `iframe-resizer` 4.x compatibility bridge described below.

## Migration from `iframe-resizer-react`

Replace the parent import:

```tsx
import IframeResizer from '@rio-cloud/iframe-resizer';
```

Replace the old iframe-side `iframeResizer.contentWindow.js` or CDN script with:

```ts
import '@rio-cloud/iframe-resizer/child';
```

The migration can be rolled out in either order. The new React parent accepts an unmodified
`iframeResizer.contentWindow.js` 4.x child, and the new child runtime accepts initialization from an
existing `iframe-resizer` 4.x parent.

The default `protocol='auto'` enables this bridge. Once every child has migrated, restrict the parent
to the modern protocol:

```tsx
<IframeResizer protocol='modern' src='https://embedded.example.com/' title='Embedded application' />;
```

The most common mappings are:

| Previous API | New API |
| --- | --- |
| native iframe props | unchanged |
| `allow` | forwarded unchanged to the native iframe attribute |
| `checkOrigin={true}` | default `allowedOrigins='src'` |
| `checkOrigin={string[]}` | `allowedOrigins={string[]}` |
| `checkOrigin={false}` | supported compatibility alias, or `allowedOrigins='any'` |
| `bodyMargin` | supported for v4 and modern children |
| `heightCalculationMethod` | supported with the existing v4 method names |
| `inPageLinks` | supported for child and parent anchor targets |
| `resizeFrom` | supported; modern children use observers in either mode |
| `direction='vertical'` | `direction='vertical'` |
| `direction='horizontal'` | `direction='horizontal'` |
| height and width resizing | `direction='both'` |
| `minHeight`, `maxHeight`, `minWidth`, `maxWidth` | unchanged |
| `onResized` | `onResized` with `{ iframe, height, width, protocol, reason }` |
| `onMessage` | `onMessage` receives the application data directly |
| `iframeRef.current.resize()` | `ref.current.resize()` |
| `iframeRef.current.sendMessage(data)` | `ref.current.sendMessage(data)` |

The rewrite intentionally does not reproduce compatibility and debugging options for old browsers
or polling-based DOM workarounds. This includes options such as `bodyBackground`, `bodyPadding`,
`interval`, `log`, `scrolling`, `sizeHeight`, `sizeWidth`, `tolerance` and `warningTimeout`. Apply
visual styles in the child application and use the native observer-based sizing instead.

Features that need an explicit product requirement before being added include:

- automatic forwarding of mouse enter/leave events;
- callbacks corresponding to `onClosed` and `onScroll`;
- automatic domain synchronization.

These features are not silently emulated by 1.0.

### Scope of the v4 bridge

The bridge supports both rollout directions for:

- initialization;
- automatic height and width resizing;
- manual resize requests;
- `sendMessage` and message callbacks;
- `inPageLinks` for anchors in the child or parent document;
- `checkOrigin`, `resizeFrom`, `bodyMargin` and height calculation methods.

It does not emulate advanced v4 methods or options such as arbitrary scrolling APIs, page
information, mouse events, closing, custom calculation methods or body styling. The v4 package is
used only as a development dependency for browser compatibility tests and is not included in the
production bundle.

## No RIO CDN dependency

The child runtime is part of the npm package. The recommended setup is to bundle the child import
with the embedded application. A service without a bundler can copy `dist/child/index.js` into its
own static assets and load it with a module script. No runtime request to a RIO CDN is required.
