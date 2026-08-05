import {
    type ConnectMessage,
    createProtocolMessage,
    type DataMessage,
    type DisconnectMessage,
    type DiscoverMessage,
    type FrameSize,
    type HeightCalculationMethod,
    isConnectedMessage,
    isDataMessage,
    isInPageLinkMessage,
    isReadyMessage,
    isResizeMessage,
    isScrollToOffsetMessage,
    type ResizeDirection,
    type ResizeFrom,
    type ResizeReason,
    type ResizeRequestMessage,
} from '../shared/protocol.js';
import { createLegacyV4Command, createLegacyV4InitMessage, parseLegacyV4Message } from './legacyV4Protocol.js';

/**
 * Origins from which the iframe may establish a connection.
 *
 * `'src'` restricts the connection to the origin derived from the iframe URL. `'any'` accepts
 * every origin and should only be used for trusted content. An array allows explicitly listed
 * origins, for example after known redirects.
 */
export type AllowedOrigins = 'any' | 'src' | readonly string[];

/** Protocol used by an established parent-child connection. */
export type ConnectionProtocol = 'legacy-v4' | 'modern';

/** Protocols accepted by the parent while discovering the child runtime. */
export type ProtocolMode = 'auto' | ConnectionProtocol;

/** Describes a size that was applied to an iframe. */
export type IframeResizeEvent = FrameSize & {
    /** Iframe whose dimensions were updated. */
    iframe: HTMLIFrameElement;

    /** Protocol over which the resize was reported. */
    protocol: ConnectionProtocol;

    /** Browser or application event that caused the child to measure itself. */
    reason: ResizeReason | 'legacy-v4';
};

/** Describes a successfully established and origin-verified connection. */
export type IframeReadyEvent = {
    /** Iframe whose child runtime connected. */
    iframe: HTMLIFrameElement;

    /** Origin verified during the connection handshake. */
    origin: string;

    /** Protocol selected for this connection. */
    protocol: ConnectionProtocol;
};

export type ParentConnectionOptions = {
    allowedOrigins: AllowedOrigins;
    bodyMargin: string | number | null | undefined;
    direction: ResizeDirection;
    heightCalculationMethod: HeightCalculationMethod;
    inPageLinks: boolean;
    maxHeight: number | undefined;
    maxWidth: number | undefined;
    minHeight: number;
    minWidth: number;
    onMessage: ((data: unknown) => void) | undefined;
    onReady: ((event: IframeReadyEvent) => void) | undefined;
    onResized: ((event: IframeResizeEvent) => void) | undefined;
    protocol: ProtocolMode;
    resizeFrom: ResizeFrom;
};

export type ParentConnection = {
    disconnect: () => void;
    requestResize: () => boolean;
    sendMessage: (data: unknown) => boolean;
};

type ParentConnectionArguments = {
    getOptions: () => ParentConnectionOptions;
    iframe: HTMLIFrameElement;
};

const getSourceOrigin = (iframe: HTMLIFrameElement): string | undefined => {
    const sandboxHasOpaqueOrigin = iframe.hasAttribute('sandbox') && !iframe.sandbox.contains('allow-same-origin');

    if (sandboxHasOpaqueOrigin) {
        return 'null';
    }

    if (iframe.srcdoc || !iframe.hasAttribute('src') || iframe.getAttribute('src') === 'about:blank') {
        return window.location.origin;
    }

    try {
        return new URL(iframe.src, document.baseURI).origin;
    } catch {
        return undefined;
    }
};

const isAllowedOrigin = (iframe: HTMLIFrameElement, origin: string, allowedOrigins: AllowedOrigins): boolean => {
    if (allowedOrigins === 'any') {
        return true;
    }

    if (Array.isArray(allowedOrigins)) {
        return allowedOrigins.includes(origin);
    }

    return origin === getSourceOrigin(iframe);
};

const getTargetOrigin = (iframe: HTMLIFrameElement, allowedOrigins: AllowedOrigins): string => {
    if (allowedOrigins === 'any' || Array.isArray(allowedOrigins)) {
        return '*';
    }

    const sourceOrigin = getSourceOrigin(iframe);
    return sourceOrigin && sourceOrigin !== 'null' ? sourceOrigin : '*';
};

const clamp = (value: number, minimum: number, maximum?: number): number =>
    Math.min(Math.max(Math.ceil(value), minimum), maximum ?? Number.POSITIVE_INFINITY);

type LegacyParentIFrame = {
    moveToAnchor?: (hash: string) => void;
    scrollToOffset?: (x: number, y: number) => void;
};

const getLegacyParentIFrame = (): LegacyParentIFrame | undefined =>
    (window as Window & { parentIFrame?: LegacyParentIFrame }).parentIFrame;

const getTarget = (location: string): HTMLElement | undefined => {
    const hash = location.split('#')[1] ?? location.replace(/^#/, '');

    if (!hash) {
        return undefined;
    }

    let decodedHash: string;
    try {
        decodedHash = decodeURIComponent(hash);
    } catch {
        decodedHash = hash;
    }

    return document.getElementById(decodedHash) ?? document.getElementsByName(decodedHash).item(0) ?? undefined;
};

export const connectParent = ({ getOptions, iframe }: ParentConnectionArguments): ParentConnection => {
    const lifecycle = new AbortController();
    const frameId = iframe.id || crypto.randomUUID();
    let activePort: MessagePort | undefined;
    let activeOrigin: string | undefined;
    let activeProtocol: ConnectionProtocol | undefined;
    let connection: AbortController | undefined;
    let visibilityObserver: MutationObserver | undefined;
    let visibilityFrame: number | undefined;

    const closeModernPort = (notifyChild: boolean) => {
        if (notifyChild) {
            activePort?.postMessage(createProtocolMessage<DisconnectMessage>({ type: 'disconnect' }));
        }

        connection?.abort();
        connection = undefined;
        activePort?.close();
        activePort = undefined;

        if (activeProtocol === 'modern') {
            activeOrigin = undefined;
            activeProtocol = undefined;
        }
    };

    const resetConnection = () => {
        closeModernPort(false);
        activeOrigin = undefined;
        activeProtocol = undefined;
    };

    const requestResize = (): boolean => {
        if (activeProtocol === 'legacy-v4') {
            iframe.contentWindow?.postMessage(createLegacyV4Command('resize'), {
                targetOrigin: activeOrigin === 'null' ? '*' : (activeOrigin ?? '*'),
            });
            return true;
        }

        if (!activePort) {
            return false;
        }
        activePort.postMessage(createProtocolMessage<ResizeRequestMessage>({ type: 'resize-request' }));
        return true;
    };

    const stopObservingVisibility = () => {
        visibilityObserver?.disconnect();
        visibilityObserver = undefined;

        if (visibilityFrame !== undefined) {
            cancelAnimationFrame(visibilityFrame);
            visibilityFrame = undefined;
        }
    };

    const observeVisibility = () => {
        if (visibilityObserver || !document.body) {
            return;
        }

        visibilityObserver = new MutationObserver(() => {
            if (visibilityFrame !== undefined) {
                return;
            }

            visibilityFrame = requestAnimationFrame(() => {
                visibilityFrame = undefined;

                const options = getOptions();
                const hasZeroHeight =
                    (options.direction === 'vertical' || options.direction === 'both') && iframe.style.height === '0px';
                const hasZeroWidth =
                    (options.direction === 'horizontal' || options.direction === 'both') &&
                    iframe.style.width === '0px';

                if (iframe.offsetParent !== null && (hasZeroHeight || hasZeroWidth)) {
                    requestResize();
                }
            });
        });
        visibilityObserver.observe(document.body, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        });
    };

    const applySize = (size: FrameSize, reason: IframeResizeEvent['reason'], protocol: ConnectionProtocol) => {
        const options = getOptions();
        const height = clamp(size.height, options.minHeight, options.maxHeight);
        const width = clamp(size.width, options.minWidth, options.maxWidth);

        if (options.direction === 'vertical' || options.direction === 'both') {
            iframe.style.height = `${height}px`;
        }

        if (options.direction === 'horizontal' || options.direction === 'both') {
            iframe.style.width = `${width}px`;
        }

        const hasZeroHeight =
            (options.direction === 'vertical' || options.direction === 'both') && iframe.style.height === '0px';
        const hasZeroWidth =
            (options.direction === 'horizontal' || options.direction === 'both') && iframe.style.width === '0px';

        if (hasZeroHeight || hasZeroWidth) {
            observeVisibility();
        } else {
            stopObservingVisibility();
        }

        options.onResized?.({ height, iframe, protocol, reason, width });
    };

    const scrollToOffset = (x: number, y: number) => {
        const iframeBounds = iframe.getBoundingClientRect();
        const targetX = window.scrollX + iframeBounds.left + x;
        const targetY = window.scrollY + iframeBounds.top + y;

        if (window.top === window.self) {
            window.scrollTo({ left: targetX, top: targetY });
        } else {
            getLegacyParentIFrame()?.scrollToOffset?.(targetX, targetY);
        }
    };

    const followInPageLink = (hash: string) => {
        const target = getTarget(hash);

        if (target) {
            const bounds = target.getBoundingClientRect();
            window.scrollTo({
                left: window.scrollX + bounds.left,
                top: window.scrollY + bounds.top,
            });
            return;
        }

        if (window.top !== window.self) {
            getLegacyParentIFrame()?.moveToAnchor?.(hash.replace(/^#/, ''));
        }
    };

    const handlePortMessage = (event: MessageEvent<unknown>) => {
        if (isConnectedMessage(event.data) && event.data.frameId === frameId) {
            getOptions().onReady?.({ iframe, origin: activeOrigin ?? 'unknown', protocol: 'modern' });
            return;
        }

        if (isResizeMessage(event.data) && event.data.frameId === frameId) {
            applySize(event.data.size, event.data.reason, 'modern');
            return;
        }

        if (isDataMessage(event.data)) {
            getOptions().onMessage?.(event.data.data);
            return;
        }

        if (isScrollToOffsetMessage(event.data)) {
            scrollToOffset(event.data.x, event.data.y);
            return;
        }

        if (isInPageLinkMessage(event.data)) {
            followInPageLink(event.data.hash);
        }
    };

    const establishConnection = (origin: string) => {
        closeModernPort(false);

        const options = getOptions();
        const channel = new MessageChannel();
        connection = new AbortController();
        activePort = channel.port1;
        activeOrigin = origin;
        activeProtocol = 'modern';
        activePort.addEventListener('message', handlePortMessage, { signal: connection.signal });
        activePort.start();

        const message = createProtocolMessage<ConnectMessage>({
            direction: options.direction,
            frameId,
            heightCalculationMethod: options.heightCalculationMethod,
            inPageLinks: options.inPageLinks,
            resizeFrom: options.resizeFrom,
            type: 'connect',
            ...(options.bodyMargin !== undefined ? { bodyMargin: options.bodyMargin } : {}),
        });
        const targetOrigin = origin === 'null' ? '*' : origin;
        iframe.contentWindow?.postMessage(message, { targetOrigin, transfer: [channel.port2] });
    };

    const handleWindowMessage = (event: MessageEvent<unknown>) => {
        if (event.source !== iframe.contentWindow) {
            return;
        }

        const options = getOptions();
        if (!isAllowedOrigin(iframe, event.origin, options.allowedOrigins)) {
            return;
        }

        if (options.protocol !== 'legacy-v4' && isReadyMessage(event.data)) {
            establishConnection(event.origin);
            return;
        }

        if (options.protocol === 'modern' || activeProtocol === 'modern') {
            return;
        }

        const message = parseLegacyV4Message(event.data);
        if (!message || message.frameId !== frameId) {
            return;
        }

        if (activeProtocol !== 'legacy-v4') {
            activeOrigin = event.origin;
            activeProtocol = 'legacy-v4';
            options.onReady?.({ iframe, origin: event.origin, protocol: 'legacy-v4' });
        }

        if (message.trigger === 'message') {
            if (message.payload !== undefined) {
                try {
                    options.onMessage?.(JSON.parse(message.payload));
                } catch {
                    // Ignore malformed application payloads from legacy children.
                }
            }
            return;
        }

        if (message.trigger === 'scrollToOffset') {
            scrollToOffset(message.width, message.height);
            return;
        }

        if (message.trigger === 'inPageLink') {
            if (message.payload) {
                followInPageLink(message.payload);
            }
            return;
        }

        if (
            !['autoResize', 'close', 'mouseenter', 'mouseleave', 'pageInfo', 'pageInfoStop', 'scrollTo'].includes(
                message.trigger
            )
        ) {
            applySize(
                {
                    height: message.height,
                    width: message.width,
                },
                'legacy-v4',
                'legacy-v4'
            );
        }
    };

    const discoverChild = () => {
        resetConnection();

        const options = getOptions();
        const targetOrigin = getTargetOrigin(iframe, options.allowedOrigins);

        if (options.protocol !== 'legacy-v4') {
            const message = createProtocolMessage<DiscoverMessage>({ type: 'discover' });
            iframe.contentWindow?.postMessage(message, { targetOrigin });
        }

        if (options.protocol !== 'modern') {
            iframe.contentWindow?.postMessage(
                createLegacyV4InitMessage({
                    bodyMargin: options.bodyMargin,
                    direction: options.direction,
                    frameId,
                    heightCalculationMethod: options.heightCalculationMethod,
                    inPageLinks: options.inPageLinks,
                    resizeFrom: options.resizeFrom,
                }),
                { targetOrigin }
            );
        }
    };

    window.addEventListener('message', handleWindowMessage, { signal: lifecycle.signal });
    iframe.addEventListener('load', discoverChild, { signal: lifecycle.signal });
    discoverChild();

    return {
        disconnect: () => {
            closeModernPort(true);
            activeOrigin = undefined;
            activeProtocol = undefined;
            stopObservingVisibility();
            lifecycle.abort();
        },
        requestResize,
        sendMessage: data => {
            if (activeProtocol === 'legacy-v4') {
                iframe.contentWindow?.postMessage(createLegacyV4Command('message', data), {
                    targetOrigin: activeOrigin === 'null' ? '*' : (activeOrigin ?? '*'),
                });
                return true;
            }

            if (!activePort) {
                return false;
            }

            activePort.postMessage(createProtocolMessage<DataMessage>({ data, type: 'message' }));
            return true;
        },
    };
};
