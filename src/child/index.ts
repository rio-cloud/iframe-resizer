import { createLegacyV4ChildMessage, parseLegacyV4ParentMessage } from '../internal/legacyV4Protocol.js';
import {
    type ConnectedMessage,
    createProtocolMessage,
    type DataMessage,
    type FrameSize,
    type HeightCalculationMethod,
    isConnectMessage,
    isDataMessage,
    isDisconnectMessage,
    isDiscoverMessage,
    isHeightCalculationMethod,
    isResizeRequestMessage,
    type ReadyMessage,
    type ResizeDirection,
    type ResizeMessage,
    type ResizeReason,
} from '../shared/protocol.js';

export type ChildMessageListener = (data: unknown) => void;

export type IframeResizerChild = {
    disconnect: () => void;
    resize: () => void;
    sendMessage: (data: unknown) => boolean;
    subscribe: (listener: ChildMessageListener) => () => void;
};

const getParentOrigin = (): string | undefined => {
    if (!document.referrer) {
        return undefined;
    }

    try {
        return new URL(document.referrer).origin;
    } catch {
        return undefined;
    }
};

const getBodyOffsetHeight = (): number => {
    const body = document.body;
    if (!body) {
        return 0;
    }

    const style = getComputedStyle(body);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    return body.offsetHeight + marginTop + marginBottom;
};

const getElementEdge = (selector: string): number => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    let edge = 0;

    for (const element of elements) {
        edge = Math.max(edge, element.getBoundingClientRect().bottom + window.scrollY);
    }

    return edge;
};

const measureHeight = (method: HeightCalculationMethod): number => {
    const root = document.documentElement;
    const body = document.body;
    const rootBounds = root.getBoundingClientRect();
    const bodyBounds = body?.getBoundingClientRect();
    const measurements = [
        getBodyOffsetHeight(),
        body?.scrollHeight ?? 0,
        root.offsetHeight,
        root.scrollHeight,
        rootBounds.height,
        bodyBounds?.height ?? 0,
    ];

    switch (method) {
        case 'bodyOffset':
            return getBodyOffsetHeight();
        case 'bodyScroll':
            return body?.scrollHeight ?? 0;
        case 'documentElementOffset':
            return root.offsetHeight;
        case 'documentElementScroll':
            return root.scrollHeight;
        case 'min':
            return Math.min(...measurements.filter(value => value > 0), Math.max(...measurements));
        case 'lowestElement':
            return Math.max(getBodyOffsetHeight(), getElementEdge('body *'));
        case 'taggedElement':
            return getElementEdge('[data-iframe-height]') || getElementEdge('body *');
        case 'auto':
        case 'grow':
        case 'max':
            return Math.max(...measurements);
    }
};

const measureDocument = (heightCalculationMethod: HeightCalculationMethod): FrameSize => {
    const root = document.documentElement;
    const body = document.body;
    const rootBounds = root.getBoundingClientRect();
    const bodyBounds = body?.getBoundingClientRect();

    return {
        height: Math.ceil(measureHeight(heightCalculationMethod)),
        width: Math.ceil(
            Math.max(
                rootBounds.width,
                root.scrollWidth,
                root.offsetWidth,
                bodyBounds?.width ?? 0,
                body?.scrollWidth ?? 0,
                body?.offsetWidth ?? 0
            )
        ),
    };
};

const HEIGHT_METHODS_REQUIRING_DOWNSIZE_PROBE = new Set<HeightCalculationMethod>([
    'bodyScroll',
    'documentElementScroll',
    'max',
    'min',
]);

const createIframeResizerChild = (): IframeResizerChild => {
    const lifecycle = new AbortController();
    const listeners = new Set<ChildMessageListener>();

    const parentOrigin = getParentOrigin();

    let activePort: MessagePort | undefined;
    let activeProtocol: 'legacy-v4' | 'modern' | undefined;
    let connection: AbortController | undefined;
    let direction: ResizeDirection = 'vertical';
    let frameId = '';
    let heightCalculationMethod: HeightCalculationMethod = 'auto';
    let lastSize: FrameSize | undefined;
    let scheduledFrame: number | undefined;
    let disconnected = false;
    let pendingReason: ResizeReason = 'manual';
    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;

    const postReady = () => {
        const message = createProtocolMessage<ReadyMessage>({ type: 'ready' });
        window.parent.postMessage(message, { targetOrigin: parentOrigin ?? '*' });
    };

    const reportSize = (reason: ResizeReason) => {
        scheduledFrame = undefined;

        if (!activeProtocol) {
            return;
        }

        const measuredSize = measureDocument(heightCalculationMethod);

        // Scroll-based measurements cannot become smaller than the current iframe viewport. The
        // v4 runtime solved this with a temporary body-offset reset. Applying that probe directly
        // avoids a visible two-message resize while retaining the same downsizing behavior.
        if (
            lastSize &&
            HEIGHT_METHODS_REQUIRING_DOWNSIZE_PROBE.has(heightCalculationMethod) &&
            measuredSize.height >= lastSize.height
        ) {
            measuredSize.height = Math.min(measuredSize.height, Math.ceil(measureHeight('bodyOffset')));
        }

        const size =
            heightCalculationMethod === 'grow' && lastSize
                ? {
                      height: Math.max(measuredSize.height, lastSize.height),
                      width: measuredSize.width,
                  }
                : measuredSize;
        const heightChanged = direction !== 'horizontal' && size.height !== lastSize?.height;
        const widthChanged = direction !== 'vertical' && size.width !== lastSize?.width;

        if (reason !== 'manual' && reason !== 'connect' && !heightChanged && !widthChanged) {
            return;
        }

        lastSize = size;
        if (activeProtocol === 'legacy-v4') {
            window.parent.postMessage(
                createLegacyV4ChildMessage(frameId, size.height, size.width, reason === 'connect' ? 'init' : reason),
                { targetOrigin: parentOrigin ?? '*' }
            );
        } else {
            activePort?.postMessage(
                createProtocolMessage<ResizeMessage>({
                    frameId,
                    reason,
                    size,
                    type: 'resize',
                })
            );
        }
    };

    const scheduleResize = (reason: ResizeReason) => {
        if (disconnected) {
            return;
        }

        if (scheduledFrame !== undefined) {
            if (reason === 'connect') {
                pendingReason = reason;
            }
            return;
        }

        pendingReason = reason;
        scheduledFrame = requestAnimationFrame(() => reportSize(pendingReason));
    };

    const stopObservers = () => {
        resizeObserver?.disconnect();
        resizeObserver = undefined;
        mutationObserver?.disconnect();
        mutationObserver = undefined;
    };

    const startObservers = () => {
        stopObservers();

        resizeObserver = new ResizeObserver(() => scheduleResize('resize-observer'));
        resizeObserver.observe(document.documentElement);
        if (document.body) {
            resizeObserver.observe(document.body);
        }

        mutationObserver = new MutationObserver(() => scheduleResize('mutation'));
        mutationObserver.observe(document.documentElement, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        });
    };

    const applyBodyMargin = (bodyMargin: string | number | null | undefined) => {
        if (document.body && bodyMargin !== null && bodyMargin !== undefined) {
            document.body.style.margin = typeof bodyMargin === 'number' ? `${bodyMargin}px` : bodyMargin;
        }
    };

    const closePort = () => {
        connection?.abort();
        connection = undefined;
        activePort?.close();
        activePort = undefined;
        activeProtocol = undefined;
        stopObservers();
    };

    const handlePortMessage = (event: MessageEvent<unknown>) => {
        if (isResizeRequestMessage(event.data)) {
            scheduleResize('manual');
            return;
        }

        if (isDataMessage(event.data)) {
            for (const listener of listeners) {
                listener(event.data.data);
            }
            return;
        }

        if (isDisconnectMessage(event.data)) {
            closePort();
            postReady();
        }
    };

    const connect = (event: MessageEvent<unknown>) => {
        if (
            event.source !== window.parent ||
            !isConnectMessage(event.data) ||
            (parentOrigin !== undefined && event.origin !== parentOrigin)
        ) {
            return;
        }

        const nextPort = event.ports.at(0);
        if (!nextPort) {
            return;
        }

        closePort();

        activePort = nextPort;
        activeProtocol = 'modern';
        direction = event.data.direction;
        frameId = event.data.frameId;
        heightCalculationMethod = isHeightCalculationMethod(event.data.heightCalculationMethod)
            ? event.data.heightCalculationMethod
            : 'auto';
        lastSize = undefined;
        applyBodyMargin(event.data.bodyMargin);

        connection = new AbortController();
        activePort.addEventListener('message', handlePortMessage, { signal: connection.signal });
        activePort.start();

        startObservers();

        activePort.postMessage(createProtocolMessage<ConnectedMessage>({ frameId, type: 'connected' }));
        scheduleResize('connect');
    };

    const handleWindowMessage = (event: MessageEvent<unknown>) => {
        if (event.source !== window.parent || (parentOrigin !== undefined && event.origin !== parentOrigin)) {
            return;
        }

        if (isDiscoverMessage(event.data)) {
            postReady();
            return;
        }

        if (isConnectMessage(event.data)) {
            connect(event);
            return;
        }

        if (activeProtocol === 'modern') {
            return;
        }

        const legacyMessage = parseLegacyV4ParentMessage(event.data);
        if (!legacyMessage) {
            return;
        }

        if (legacyMessage.type === 'init') {
            closePort();
            activeProtocol = 'legacy-v4';
            direction = legacyMessage.calculateWidth ? 'both' : 'vertical';
            frameId = legacyMessage.frameId;
            heightCalculationMethod = legacyMessage.heightCalculationMethod;
            lastSize = undefined;
            applyBodyMargin(legacyMessage.bodyMargin);
            startObservers();
            scheduleResize('connect');
            return;
        }

        if (activeProtocol !== 'legacy-v4') {
            return;
        }

        if (legacyMessage.type === 'message') {
            if (legacyMessage.payload !== undefined) {
                try {
                    const data: unknown = JSON.parse(legacyMessage.payload);
                    for (const listener of listeners) {
                        listener(data);
                    }
                } catch {
                    // Ignore malformed application payloads from legacy parents.
                }
            }
            return;
        }

        scheduleResize('manual');
    };

    window.addEventListener('message', handleWindowMessage, { signal: lifecycle.signal });

    document.addEventListener('load', () => scheduleResize('document-load'), {
        capture: true,
        signal: lifecycle.signal,
    });

    window.addEventListener('resize', () => scheduleResize('resize-observer'), {
        passive: true,
        signal: lifecycle.signal,
    });

    void document.fonts.ready.then(() => scheduleResize('font-load'));

    postReady();

    return {
        disconnect: () => {
            disconnected = true;
            lifecycle.abort();
            closePort();

            listeners.clear();

            if (scheduledFrame !== undefined) {
                cancelAnimationFrame(scheduledFrame);
                scheduledFrame = undefined;
            }
        },
        resize: () => scheduleResize('manual'),
        sendMessage: data => {
            if (activeProtocol === 'legacy-v4') {
                window.parent.postMessage(createLegacyV4ChildMessage(frameId, 0, 0, 'message', data), {
                    targetOrigin: parentOrigin ?? '*',
                });
                return true;
            }

            if (!activePort) {
                return false;
            }

            activePort.postMessage(createProtocolMessage<DataMessage>({ data, type: 'message' }));
            return true;
        },
        subscribe: listener => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
};

const child = typeof window !== 'undefined' && window.parent !== window ? createIframeResizerChild() : undefined;

export default child;
