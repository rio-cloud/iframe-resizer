import { describe, expect, it } from 'vitest';

import {
    type ConnectMessage,
    createProtocolMessage,
    IFRAME_RESIZER_PROTOCOL,
    IFRAME_RESIZER_PROTOCOL_VERSION,
    type InPageLinkMessage,
    isConnectMessage,
    isInPageLinkMessage,
    isProtocolMessage,
    isResizeMessage,
    isScrollToOffsetMessage,
    type ResizeMessage,
    type ScrollToOffsetMessage,
} from '../../src/shared/protocol.js';

describe('protocol', () => {
    it('adds the protocol identity and version to messages', () => {
        const message = createProtocolMessage<ConnectMessage>({
            direction: 'vertical',
            frameId: 'frame-id',
            type: 'connect',
        });

        expect(message).toEqual({
            direction: 'vertical',
            frameId: 'frame-id',
            protocol: IFRAME_RESIZER_PROTOCOL,
            type: 'connect',
            version: IFRAME_RESIZER_PROTOCOL_VERSION,
        });
        expect(isConnectMessage(message)).toBe(true);
    });

    it('validates in-page link and scroll offset messages', () => {
        expect(
            isInPageLinkMessage(
                createProtocolMessage<InPageLinkMessage>({
                    hash: '#details',
                    type: 'in-page-link',
                })
            )
        ).toBe(true);
        expect(
            isScrollToOffsetMessage(
                createProtocolMessage<ScrollToOffsetMessage>({
                    type: 'scroll-to-offset',
                    x: 20,
                    y: 320,
                })
            )
        ).toBe(true);
        expect(
            isScrollToOffsetMessage(
                createProtocolMessage<ScrollToOffsetMessage>({ type: 'scroll-to-offset', x: 20, y: Number.NaN })
            )
        ).toBe(false);
    });

    it('rejects messages from other protocols and malformed resize messages', () => {
        expect(isProtocolMessage({ protocol: 'other', type: 'ready', version: 1 })).toBe(false);

        const message = createProtocolMessage<ResizeMessage>({
            frameId: 'frame-id',
            reason: 'mutation',
            size: { height: Number.NaN, width: 400 },
            type: 'resize',
        });

        expect(isResizeMessage(message)).toBe(false);
    });
});
