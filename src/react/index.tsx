import { type ComponentPropsWithoutRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import {
    type AllowedOrigins,
    connectParent,
    type IframeReadyEvent,
    type IframeResizeEvent,
    type ParentConnection,
    type ParentConnectionOptions,
    type ProtocolMode,
} from '../internal/connectParent.js';
import type { HeightCalculationMethod, ResizeDirection, ResizeFrom } from '../shared/protocol.js';

export type {
    AllowedOrigins,
    ConnectionProtocol,
    IframeReadyEvent,
    IframeResizeEvent,
    ProtocolMode,
} from '../internal/connectParent.js';
export type {
    HeightCalculationMethod,
    ResizeDirection,
    ResizeFrom,
} from '../shared/protocol.js';

export type IframeResizerRef = {
    /**
     * Permanently closes the current connection and removes its listeners.
     *
     * The component does not reconnect automatically. Remount it to establish a new connection.
     */
    disconnect: () => void;

    /** The rendered iframe element, or `null` before it has mounted. */
    element: HTMLIFrameElement | null;

    /**
     * Requests a fresh measurement from the connected child.
     *
     * @returns `true` when the request was sent, or `false` while no child is connected.
     */
    resize: () => boolean;

    /**
     * Sends application-specific data to the connected child.
     *
     * @returns `true` when the message was sent, or `false` while no child is connected.
     */
    sendMessage: (data: unknown) => boolean;
};

type ResizerProps = {
    /**
     * Defines the browser features available to the embedded document.
     *
     * The value is forwarded unchanged to the native iframe `allow` attribute.
     */
    allow?: ComponentPropsWithoutRef<'iframe'>['allow'];

    /**
     * Controls which child origins may establish a connection with the parent.
     *
     * Use `'src'` to allow only the origin derived from the iframe's `src`, provide an array for
     * known redirect targets, or use `'any'` only when every possible child origin is trusted.
     *
     * @defaultValue `'src'`
     */
    allowedOrigins?: AllowedOrigins;

    /**
     * Applies a margin to the body of the embedded document.
     *
     * Numbers are interpreted as CSS pixels. Prefer styling the embedded application directly for
     * new integrations; this prop exists for iframe-resizer 4.x compatibility.
     */
    bodyMargin?: string | number | null;

    /**
     * Legacy iframe-resizer origin policy.
     *
     * `false` maps to `allowedOrigins='any'`, `true` maps to `allowedOrigins='src'`, and an array
     * maps to the equivalent `allowedOrigins` array. An explicitly supplied `allowedOrigins` prop
     * takes precedence.
     *
     * @deprecated Use `allowedOrigins` instead.
     */
    checkOrigin?: boolean | readonly string[];

    /**
     * Selects which iframe dimensions are updated from measurements reported by the child.
     *
     * @defaultValue `'both'`
     */
    direction?: ResizeDirection;

    /**
     * Selects how the child document height is measured.
     *
     * `'auto'` uses the maximum body and document dimensions. The remaining values preserve the
     * iframe-resizer 4.x calculation names for compatible layouts.
     *
     * @defaultValue `'auto'`
     */
    heightCalculationMethod?: HeightCalculationMethod;

    /**
     * Enables hash-link navigation initiated inside the child document.
     *
     * Targets inside the child scroll the parent page to the corresponding position in the iframe.
     * If the child cannot find the target, the hash is forwarded to a matching `id` or `name` in
     * the parent document.
     *
     * @defaultValue `false`
     */
    inPageLinks?: boolean;

    /**
     * Maximum height, in CSS pixels, that may be applied to the iframe.
     *
     * When omitted, the reported height has no upper limit.
     */
    maxHeight?: number;

    /**
     * Maximum width, in CSS pixels, that may be applied to the iframe.
     *
     * When omitted, the reported width has no upper limit.
     */
    maxWidth?: number;

    /**
     * Minimum height, in CSS pixels, that may be applied to the iframe.
     *
     * @defaultValue `0`
     */
    minHeight?: number;

    /**
     * Minimum width, in CSS pixels, that may be applied to the iframe.
     *
     * @defaultValue `0`
     */
    minWidth?: number;

    /**
     * Called when the child sends application-specific data through the established connection.
     *
     * The payload is typed as `unknown`; consumers should validate or narrow it before use.
     */
    onMessage?: (data: unknown) => void;

    /**
     * Called after the child has completed the handshake and the dedicated message channel is ready.
     *
     * The event contains the iframe element and the origin that was verified during the handshake.
     */
    onReady?: (event: IframeReadyEvent) => void;

    /**
     * Called after a size reported by the child has been clamped and applied to the iframe.
     *
     * The event contains the applied dimensions, iframe element and resize reason.
     */
    onResized?: (event: IframeResizeEvent) => void;

    /**
     * Selects which child protocol the parent accepts.
     *
     * `'auto'` supports both the modern runtime and iframe-resizer 4.x children, preferring the
     * modern protocol when both are present. Use `'modern'` after every child has migrated, or
     * `'legacy-v4'` to force the compatibility bridge.
     *
     * @defaultValue `'auto'`
     */
    protocol?: ProtocolMode;

    /**
     * Selects which window is considered the source of resize events by iframe-resizer 4.x
     * children.
     *
     * The modern child uses observers in either mode, so no polling or duplicate parent listener
     * is needed.
     *
     * @defaultValue `'parent'`
     */
    resizeFrom?: ResizeFrom;

    /**
     * Provides the accessible name for the embedded document.
     *
     * This optional prop is forwarded to the native iframe `title` attribute. A descriptive title
     * is recommended for accessibility; the backwards-compatible default is `iframe`.
     *
     * @defaultValue `'iframe'`
     */
    title?: string;
};

export type IframeResizerProps = Omit<ComponentPropsWithoutRef<'iframe'>, keyof ResizerProps> & ResizerProps;

const IframeResizer = forwardRef<IframeResizerRef, IframeResizerProps>((props, ref) => {
    const {
        allowedOrigins,
        bodyMargin,
        checkOrigin,
        direction = 'both',
        heightCalculationMethod = 'auto',
        inPageLinks = false,
        maxHeight,
        maxWidth,
        minHeight = 0,
        minWidth = 0,
        onMessage,
        onReady,
        onResized,
        protocol = 'auto',
        resizeFrom = 'parent',
        style,
        title = 'iframe',
        ...iframeProps
    } = props;

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const connectionRef = useRef<ParentConnection | undefined>(undefined);

    const effectiveAllowedOrigins: AllowedOrigins =
        allowedOrigins ??
        (checkOrigin === false ? 'any' : typeof checkOrigin !== 'boolean' && checkOrigin ? checkOrigin : 'src');

    const allowedOriginsKey =
        typeof effectiveAllowedOrigins === 'string'
            ? effectiveAllowedOrigins
            : JSON.stringify([...effectiveAllowedOrigins].sort());

    const optionsRef = useRef<ParentConnectionOptions>({
        allowedOrigins: effectiveAllowedOrigins,
        bodyMargin,
        direction,
        heightCalculationMethod,
        inPageLinks,
        maxHeight,
        maxWidth,
        minHeight,
        minWidth,
        onMessage,
        onReady,
        onResized,
        protocol,
        resizeFrom,
    });

    optionsRef.current = {
        allowedOrigins: effectiveAllowedOrigins,
        bodyMargin,
        direction,
        heightCalculationMethod,
        inPageLinks,
        maxHeight,
        maxWidth,
        minHeight,
        minWidth,
        onMessage,
        onReady,
        onResized,
        protocol,
        resizeFrom,
    };

    // Connection-level option changes require a fresh protocol handshake.
    // biome-ignore lint/correctness/useExhaustiveDependencies: the values are intentionally connection keys.
    useEffect(() => {
        const iframe = iframeRef.current;

        if (!iframe) {
            return;
        }

        connectionRef.current = connectParent({
            getOptions: () => optionsRef.current,
            iframe,
        });

        return () => {
            connectionRef.current?.disconnect();
            connectionRef.current = undefined;
        };
    }, [allowedOriginsKey, bodyMargin, direction, heightCalculationMethod, inPageLinks, protocol, resizeFrom]);

    useImperativeHandle(
        ref,
        () => ({
            disconnect: () => connectionRef.current?.disconnect(),
            element: iframeRef.current,
            resize: () => connectionRef.current?.requestResize() ?? false,
            sendMessage: data => connectionRef.current?.sendMessage(data) ?? false,
        }),
        []
    );

    return <iframe {...iframeProps} ref={iframeRef} style={style} title={title} />;
});

IframeResizer.displayName = 'IframeResizer';

export { IframeResizer };
export default IframeResizer;
