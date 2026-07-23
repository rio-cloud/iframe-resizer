import { describe, expect, it } from 'vitest';

import {
    type ConnectMessage,
    createProtocolMessage,
    IFRAME_RESIZER_PROTOCOL,
    IFRAME_RESIZER_PROTOCOL_VERSION,
    isConnectMessage,
    isProtocolMessage,
    isResizeMessage,
    type ResizeMessage,
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
