import { describe, expect, it } from 'vitest';

import {
    createLegacyV4ChildCommand,
    createLegacyV4ChildMessage,
    createLegacyV4Command,
    createLegacyV4InitMessage,
    parseLegacyV4Message,
    parseLegacyV4ParentMessage,
} from '../../src/internal/legacyV4Protocol.js';

describe('iframe-resizer v4 protocol', () => {
    it('creates an initialization message understood by the v4 child runtime', () => {
        expect(
            createLegacyV4InitMessage({
                bodyMargin: undefined,
                direction: 'vertical',
                frameId: 'frame-id',
                heightCalculationMethod: 'auto',
                inPageLinks: false,
                resizeFrom: 'parent',
            })
        ).toBe(
            '[iFrameSizer]frame-id:8:false:false:32:true:true:null:bodyOffset:null:null:0:false:parent:scroll:false'
        );
        expect(
            createLegacyV4InitMessage({
                bodyMargin: '0 0 20px 0',
                direction: 'both',
                frameId: 'frame-id',
                heightCalculationMethod: 'lowestElement',
                inPageLinks: true,
                resizeFrom: 'child',
            })
        ).toBe(
            '[iFrameSizer]frame-id:8:true:false:32:true:true:0 0 20px 0:lowestElement:null:null:0:true:child:scroll:false'
        );
    });

    it('parses resize messages and preserves colons in application payloads', () => {
        expect(parseLegacyV4Message('[iFrameSizer]frame-id:420:640:mutationObserver')).toEqual({
            frameId: 'frame-id',
            height: 420,
            payload: undefined,
            trigger: 'mutationObserver',
            width: 640,
        });
        expect(parseLegacyV4Message('[iFrameSizer]frame-id:0:0:message:{"time":"12:30"}')).toEqual({
            frameId: 'frame-id',
            height: 0,
            payload: '{"time":"12:30"}',
            trigger: 'message',
            width: 0,
        });
    });

    it('creates resize and JSON message commands for a v4 child', () => {
        expect(createLegacyV4Command('resize')).toBe('[iFrameSizer]resize');
        expect(createLegacyV4Command('message', { status: 'ready' })).toBe('[iFrameSizer]message:{"status":"ready"}');
    });

    it('parses v4 parent initialization and commands', () => {
        expect(
            parseLegacyV4ParentMessage(
                '[iFrameSizer]frame-id:8:true:false:32:true:true:null:bodyOffset:null:null:0:false:parent:scroll:false'
            )
        ).toEqual({
            bodyMargin: null,
            calculateWidth: true,
            frameId: 'frame-id',
            heightCalculationMethod: 'bodyOffset',
            inPageLinks: false,
            resizeFrom: 'parent',
            type: 'init',
        });
        expect(parseLegacyV4ParentMessage('[iFrameSizer]message:{"time":"12:30"}')).toEqual({
            payload: '{"time":"12:30"}',
            type: 'message',
        });
        expect(parseLegacyV4ParentMessage('[iFrameSizer]resize')).toEqual({
            payload: undefined,
            type: 'resize',
        });
        expect(parseLegacyV4ParentMessage('[iFrameSizer]moveToAnchor:#details')).toEqual({
            payload: '#details',
            type: 'moveToAnchor',
        });
    });

    it('creates messages understood by a v4 parent', () => {
        expect(createLegacyV4ChildMessage('frame-id', 420, 640, 'mutation')).toBe(
            '[iFrameSizer]frame-id:420:640:mutation'
        );
        expect(createLegacyV4ChildMessage('frame-id', 0, 0, 'message', { status: 'ready' })).toBe(
            '[iFrameSizer]frame-id:0:0:message:{"status":"ready"}'
        );
        expect(createLegacyV4ChildCommand('frame-id', 320, 24, 'scrollToOffset')).toBe(
            '[iFrameSizer]frame-id:320:24:scrollToOffset'
        );
        expect(createLegacyV4ChildCommand('frame-id', 0, 0, 'inPageLink', '#details')).toBe(
            '[iFrameSizer]frame-id:0:0:inPageLink:#details'
        );
    });

    it('rejects unrelated or malformed messages', () => {
        expect(parseLegacyV4Message('frame-id:420:640:init')).toBeUndefined();
        expect(parseLegacyV4Message('[iFrameSizer]frame-id:not-a-number:640:init')).toBeUndefined();
    });
});
