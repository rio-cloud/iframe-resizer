# @rio-cloud/iframe-resizer

Automatic iframe resizing for React hosts and modern browser clients.

The package contains both sides of the connection:

- a React component for the parent application;
- a framework-independent child runtime for the embedded application.

The child runtime is shipped with the npm package. It does not depend on a RIO CDN.

## Requirements

- React 18 or React 19 in the parent application;
- modern browsers with native support for ES modules, `ResizeObserver`, `MutationObserver`,
  `MessageChannel`, `AbortController` and `crypto.randomUUID()`;
- a bundler or another way to serve ES modules.

The package is ESM-only. It contains no CommonJS build, polyfills or transpilation for legacy browsers.
React is a peer dependency and is not included in the bundle.

## Installation

Install the package in the parent application:

```sh
npm install @rio-cloud/iframe-resizer
```

Install the same package in the embedded application so it can bundle the child runtime:

```sh
npm install @rio-cloud/iframe-resizer
```

## Parent application

```tsx
import IframeResizer from '@rio-cloud/iframe-resizer';

export const EmbeddedApplication = () => (
    <IframeResizer
        src='https://embedded.example.com/'
        title='Embedded application'
        onReady={({ origin, protocol }) => {
            console.info(`Connected to ${origin} using ${protocol}`);
        }}
    />
);
```

The origin derived from `src` is the only origin allowed by default. When the URL may redirect to a
known origin, list every accepted origin explicitly:

```tsx
<IframeResizer
    allowedOrigins={['https://embedded.example.com', 'https://embedded-eu.example.com']}
    src='https://embedded.example.com/'
    title='Embedded application'
/>;
```

Use `allowedOrigins='any'` only when every possible child origin is trusted.

## Interactive demo

Run the local demo to see the primary child-to-parent resizing use case:

```sh
npm start
```

The child page lets you add and remove dynamic content. Its runtime reports every height change to
the React parent, which updates the iframe so that the embedded page does not need its own vertical
scrollbar. Links in the child demonstrate `inPageLinks` navigation to targets in both the child and
parent documents.

### Props

`IframeResizer` accepts native iframe props such as `src`, `srcDoc`, `allow`, `sandbox`,
`className`, `style` and `loading` in addition to:

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` | `string` | `'iframe'` | Accessible name of the iframe; use a descriptive value when possible |
| `allowedOrigins` | `'src' \| 'any' \| readonly string[]` | `'src'` | Origins allowed to connect |
| `checkOrigin` | `boolean \| readonly string[]` | none | Deprecated v4 alias for `allowedOrigins` |
| `direction` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | Dimensions controlled by the child |
| `resizeFrom` | `'parent' \| 'child'` | `'parent'` | v4 resize-event source compatibility |
| `bodyMargin` | `string \| number \| null` | none | Body margin applied inside the child |
| `heightCalculationMethod` | `HeightCalculationMethod` | `'auto'` | Child height measurement strategy |
| `inPageLinks` | `boolean` | `false` | Forward hash-link navigation from child to parent |
| `protocol` | `'auto' \| 'modern' \| 'legacy-v4'` | `'auto'` | Accepted child protocol |
| `minHeight`, `minWidth` | `number` | `0` | Lower size limits in pixels |
| `maxHeight`, `maxWidth` | `number` | none | Upper size limits in pixels |
| `onReady` | `(event) => void` | none | Called after the secure connection is ready |
| `onResized` | `(event) => void` | none | Called after a child size is applied |
| `onMessage` | `(data: unknown) => void` | none | Receives application data from the child |

The component ref exposes the iframe element and imperative communication:

```tsx
import { useRef } from 'react';
import IframeResizer, { type IframeResizerRef } from '@rio-cloud/iframe-resizer';

const ref = useRef<IframeResizerRef>(null);

<IframeResizer ref={ref} src='/embedded/' title='Embedded application' />;

ref.current?.resize();
ref.current?.sendMessage({ theme: 'dark' });
ref.current?.disconnect();
```

`resize()` and `sendMessage()` return `false` until the child has established a connection. Use
`onReady` when an action must be sent as soon as the channel is available. `disconnect()` closes the
connection and removes its listeners permanently; remount the component to connect again.

### iframe-resizer 4.x compatibility

The default `protocol='auto'` supports incremental migrations in both directions:

| Parent | Child | Supported |
| --- | --- | --- |
| `@rio-cloud/iframe-resizer` | `@rio-cloud/iframe-resizer/child` | yes, modern protocol |
| `@rio-cloud/iframe-resizer` | `iframeResizer.contentWindow.js` 4.x | yes, legacy bridge |
| `iframe-resizer` 4.x | `@rio-cloud/iframe-resizer/child` | yes, legacy bridge |

In auto mode the modern `MessageChannel` protocol is preferred when both protocols are available.
Set `protocol='modern'` after every embedded application has migrated to disable legacy string
messages. Use `protocol='legacy-v4'` only for diagnosis or when a known child must be forced onto the
bridge.

Iframes may be mounted inside initially hidden tabs, dialogs or dropdowns. If a child reports a zero
dimension while hidden, the parent automatically requests a new measurement when the iframe becomes
visible. No protocol or resize-direction override is required for this v4-compatible behavior.

The bridge covers initialization, automatic height and width updates, manual resize requests,
application messages and `inPageLinks` in both directions. `checkOrigin`, `resizeFrom`, `bodyMargin`
and the v4 height calculation method names are also mapped. Advanced v4 page-info, mouse and close
APIs are not emulated.

## Embedded application

Import the child entry once at application startup:

```ts
import iframeResizerChild from '@rio-cloud/iframe-resizer/child';

iframeResizerChild?.subscribe(message => {
    console.info('Message from the parent', message);
});

iframeResizerChild?.sendMessage({ status: 'ready' });
```

Importing the child entry starts its observers automatically when the module runs inside an iframe.
The default export is `undefined` when it runs in a top-level window.

`subscribe()` returns a function that removes the registered listener. `sendMessage()` returns
`false` until a parent connection is ready. Calling `resize()` schedules a new measurement for the
active connection; calls made before connecting have no effect. The connection handshake performs
its own initial measurement. `disconnect()` permanently stops the singleton runtime and removes all
observers and listeners. Reload the embedded document to start a new runtime after disconnecting.

`ResizeObserver` detects layout size changes. A `MutationObserver`, document load events and font
loading cover changes that may not resize an already observed element directly. Notifications are
coalesced with `requestAnimationFrame`.

### In-page links

Enable `inPageLinks` when hash links inside the child should reposition the parent page:

```tsx
<IframeResizer
    inPageLinks
    src='https://embedded.example.com/'
    title='Embedded application'
/>;
```

Links such as `<a href='#details'>` are intercepted by the child runtime. If `details` exists inside
the child, the parent scrolls to its position within the iframe. If it does not exist in the child,
the hash is forwarded to an element with a matching `id` or `name` in the parent document.

### Using `srcDoc`

`srcDoc` is supported as a native iframe prop. The HTML must load the child runtime inside the
embedded document:

```tsx
<IframeResizer
    srcDoc={`
        <!doctype html>
        <main>Embedded content</main>
        <script type="module" src="/assets/rio-iframe-resizer-child.js"></script>
    `}
    title='Embedded content'
/>;
```

Relative asset URLs in `srcDoc` resolve against the parent document. When `sandbox` is used,
`allow-scripts` is required for the child runtime. A sandbox without `allow-same-origin` uses the
opaque `null` origin, which is supported by additionally validating the exact iframe window.

### Serving the child script without bundling

The published `dist/child/index.js` file is a self-contained ES module. A service can copy that file
from `node_modules` into its own static assets and serve it from its own origin:

```html
<script type="module" src="/assets/rio-iframe-resizer-child.js"></script>
```

The package does not load code from a CDN at runtime.

## Security model

The modern handshake uses `window.postMessage` and validates both the sending window and its origin.
After the handshake, the parent and child communicate over a dedicated `MessageChannel`; unrelated
global `message` events cannot resize the iframe.

The v4 bridge must retain the legacy global string-message format. It still validates that every
message came from the exact iframe or parent window and from an allowed origin. Disable it with
`protocol='modern'` when migration is complete to reduce the accepted protocol surface.

For sandboxed iframes without `allow-same-origin`, the browser reports the opaque origin as `null`.
The parent still verifies that the message came from the iframe's exact `contentWindow`.

## Development

Use Node.js 24 or newer:

```sh
npm install
npm run check
```

`npm run check` runs formatting and lint checks, strict TypeScript, Vitest unit tests, a Playwright
iframe integration test, the production build and a package-content dry run.

See [MIGRATION.md](./MIGRATION.md) for the breaking changes from the old package and from
`iframe-resizer-react`.

## License

Licensed under the [Apache License 2.0](./LICENSE).
