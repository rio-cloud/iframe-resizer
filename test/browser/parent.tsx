import { createRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import IframeResizer, {
    type ConnectionProtocol,
    type IframeResizeEvent,
    type IframeResizerRef,
} from '../../src/react/index.js';

declare global {
    interface Window {
        browserTestState: {
            lastHeight: number;
            message: unknown;
            protocol: ConnectionProtocol | undefined;
            ready: boolean;
        };
        sendBrowserTestMessage: (data: unknown) => boolean;
    }
}

window.browserTestState = {
    lastHeight: 0,
    message: undefined,
    protocol: undefined,
    ready: false,
};

const root = document.querySelector('#root');
const iframeRef = createRef<IframeResizerRef>();
const protocol = new URLSearchParams(window.location.search).get('protocol');
const legacyInPageLinks = protocol === 'legacy-in-page-links';
const hiddenLegacy = protocol === 'hidden-legacy-v4';
const legacy = protocol === 'legacy-v4' || legacyInPageLinks || hiddenLegacy;
const legacyOptions = protocol === 'legacy-options';
const crossOrigin = protocol === 'cross-origin';
const inPageLinks = protocol === 'in-page-links' || legacyInPageLinks;
const srcDoc =
    protocol === 'srcdoc'
        ? `<!doctype html>
            <html lang="en">
                <body>
                    <main id="content" style="height: 180px">
                        <button id="grow" type="button">Grow srcDoc content</button>
                    </main>
                    <script type="module">
                        import '/src/child/index.ts';
                        document.querySelector('#grow')?.addEventListener('click', () => {
                            document.querySelector('#content').style.height = '420px';
                        });
                    </script>
                </body>
            </html>`
        : undefined;

if (!root) {
    throw new Error('Browser test root is missing');
}

window.sendBrowserTestMessage = data => iframeRef.current?.sendMessage(data) ?? false;

const BrowserTest = () => {
    const [iframeVisible, setIframeVisible] = useState(!hiddenLegacy);

    return (
        <>
            {hiddenLegacy && (
                <button onClick={() => setIframeVisible(true)} type='button'>
                    Show legacy iframe
                </button>
            )}
            {inPageLinks && <div data-testid='parent-spacer' style={{ height: 800 }} />}
            <div style={{ display: iframeVisible ? 'block' : 'none' }}>
                <IframeResizer
                    {...((legacy && !hiddenLegacy) || legacyOptions
                        ? {
                              bodyMargin: '0 0 20px 0',
                              checkOrigin: false,
                              heightCalculationMethod: legacy ? ('lowestElement' as const) : ('max' as const),
                              resizeFrom: 'child' as const,
                          }
                        : {})}
                    inPageLinks={inPageLinks}
                    onMessage={message => {
                        window.browserTestState.message = message;
                    }}
                    onReady={({ protocol }) => {
                        window.browserTestState.protocol = protocol;
                        window.browserTestState.ready = true;
                    }}
                    onResized={(event: IframeResizeEvent) => {
                        window.browserTestState.lastHeight = event.height;
                    }}
                    ref={iframeRef}
                    src={
                        srcDoc
                            ? undefined
                            : legacy
                              ? `/test/browser/legacy-child.html${inPageLinks ? '?inPageLinks=true' : ''}`
                              : crossOrigin || inPageLinks
                                ? `http://127.0.0.1:4174/test/browser/child.html${inPageLinks ? '?inPageLinks=true' : ''}`
                                : '/test/browser/child.html'
                    }
                    srcDoc={srcDoc}
                    style={{ border: 0, width: 480 }}
                    title='Embedded browser test'
                />
            </div>
            {inPageLinks && (
                <>
                    <div style={{ height: 700 }} />
                    <h2 id='parent-anchor'>Parent anchor target</h2>
                    <div style={{ height: 800 }} />
                </>
            )}
        </>
    );
};

createRoot(root).render(<BrowserTest />);
