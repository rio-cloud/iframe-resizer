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
    isReadyMessage,
    isResizeMessage,
    type ResizeDirection,
    type ResizeFrom,
    type ResizeReason,
    type ResizeRequestMessage,
} from '../shared/protocol.js';
import { createLegacyV4Command, createLegacyV4InitMessage, parseLegacyV4Message } from './legacyV4Protocol.js';

export type AllowedOrigins = 'any' | 'src' | readonly string[];
export type ConnectionProtocol = 'legacy-v4' | 'modern';
export type ProtocolMode = 'auto' | ConnectionProtocol;

export type IframeResizeEvent = FrameSize & {
    iframe: HTMLIFrameElement;
    protocol: ConnectionProtocol;
    reason: ResizeReason | 'legacy-v4';
};

export type IframeReadyEvent = {
    iframe: HTMLIFrameElement;
    origin: string;
    protocol: ConnectionProtocol;
};

export type ParentConnectionOptions = {
    allowedOrigins: AllowedOrigins;
    bodyMargin: string | number | null | undefined;
    direction: ResizeDirection;
    heightCalculationMethod: HeightCalculationMethod;
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

export const connectParent = ({ getOptions, iframe }: ParentConnectionArguments): ParentConnection => {
    const lifecycle = new AbortController();
    const frameId = iframe.id || crypto.randomUUID();
    let activePort: MessagePort | undefined;
    let activeOrigin: string | undefined;
    let activeProtocol: ConnectionProtocol | undefined;
    let connection: AbortController | undefined;

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

        options.onResized?.({ height, iframe, protocol, reason, width });
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

        if (
            ![
                'autoResize',
                'close',
                'inPageLink',
                'mouseenter',
                'mouseleave',
                'pageInfo',
                'pageInfoStop',
                'scrollTo',
                'scrollToOffset',
            ].includes(message.trigger)
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
            lifecycle.abort();
        },
        requestResize: () => {
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
        },
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
