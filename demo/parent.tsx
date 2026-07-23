import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import IframeResizer, { type ConnectionProtocol, type IframeResizeEvent } from '../src/react/index.js';

const formatHeight = (height: number | undefined) => (height === undefined ? 'Waiting…' : `${height}px`);

const Demo = () => {
    const [height, setHeight] = useState<number>();
    const [protocol, setProtocol] = useState<ConnectionProtocol>();
    const [resizeCount, setResizeCount] = useState(0);

    const handleResize = ({ height: nextHeight }: IframeResizeEvent) => {
        setHeight(nextHeight);
        setResizeCount(count => count + 1);
    };

    return (
        <main className='demo-shell'>
            <header className='demo-header'>
                <p className='eyebrow'>@rio-cloud/iframe-resizer</p>
                <h1>Child-to-parent height resizing</h1>
                <p className='intro'>
                    Add or remove content inside the embedded application. The child reports its document height and the
                    React parent updates the iframe, so the child never needs its own vertical scrollbar.
                </p>
            </header>

            <section className='metrics' aria-label='Connection status'>
                <div>
                    <span>Connection</span>
                    <strong data-testid='connection-status'>{protocol ?? 'Connecting…'}</strong>
                </div>
                <div>
                    <span>Iframe height</span>
                    <strong data-testid='iframe-height'>{formatHeight(height)}</strong>
                </div>
                <div>
                    <span>Resize events</span>
                    <strong data-testid='resize-count'>{resizeCount}</strong>
                </div>
            </section>

            <section className='frame-section' aria-labelledby='frame-heading'>
                <div className='frame-heading'>
                    <div>
                        <p className='eyebrow'>React parent</p>
                        <h2 id='frame-heading'>Embedded application</h2>
                    </div>
                    <span className='no-scroll-badge'>Child scrolling disabled</span>
                </div>

                <div className='frame-boundary'>
                    <IframeResizer
                        heightCalculationMethod='max'
                        onReady={event => setProtocol(event.protocol)}
                        onResized={handleResize}
                        scrolling='no'
                        src='/demo/child.html'
                        style={{ border: 0, display: 'block', width: '100%' }}
                        title='Resizable demo application'
                    />
                </div>
            </section>

            <section className='explanation'>
                <h2>What happens here?</h2>
                <ol>
                    <li>
                        The child loads the package runtime from the <code>/child</code> entry point.
                    </li>
                    <li>
                        A <code>ResizeObserver</code> and a <code>MutationObserver</code> detect content changes.
                    </li>
                    <li>The measured height is sent to the parent, which applies it to the iframe element.</li>
                </ol>
            </section>
        </main>
    );
};

const root = document.querySelector('#root');

if (!root) {
    throw new Error('Demo root element is missing');
}

createRoot(root).render(<Demo />);
