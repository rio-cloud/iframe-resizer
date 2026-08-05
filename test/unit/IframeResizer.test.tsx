import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const parentConnection = vi.hoisted(() => ({
    disconnect: vi.fn(),
    requestResize: vi.fn(() => true),
    sendMessage: vi.fn(() => true),
}));
const connectParentMock = vi.hoisted(() => vi.fn((_arguments: unknown) => parentConnection));

vi.mock('../../src/internal/connectParent.js', () => ({
    connectParent: connectParentMock,
}));

import type { ParentConnectionOptions } from '../../src/internal/connectParent.js';
import IframeResizer, { type IframeResizerRef } from '../../src/react/index.js';

const getLatestOptions = (): ParentConnectionOptions => {
    const call = connectParentMock.mock.calls.at(-1);
    const argumentsWithOptions = call?.[0] as { getOptions: () => ParentConnectionOptions } | undefined;

    if (!argumentsWithOptions) {
        throw new Error('Expected IframeResizer to establish a parent connection');
    }

    return argumentsWithOptions.getOptions();
};

afterEach(() => {
    vi.clearAllMocks();
});

describe('IframeResizer', () => {
    it('uses a backwards-compatible default title when none is provided', () => {
        render(<IframeResizer srcDoc='<!doctype html><title>Child</title>' />);

        expect(screen.getByTitle('iframe').getAttribute('title')).toBe('iframe');
    });

    it('passes native iframe attributes through and exposes the element', () => {
        const ref = createRef<IframeResizerRef>();

        render(
            <IframeResizer
                allow='clipboard-read; geolocation'
                heightCalculationMethod='max'
                name='embedded-app'
                ref={ref}
                srcDoc='<!doctype html><title>Child</title>'
                title='Embedded application'
            />
        );

        const iframe = screen.getByTitle<HTMLIFrameElement>('Embedded application');
        expect(iframe.allow).toBe('clipboard-read; geolocation');
        expect(iframe.name).toBe('embedded-app');
        expect(ref.current?.element).toBe(iframe);
        expect(getLatestOptions().direction).toBe('both');
        expect(getLatestOptions().heightCalculationMethod).toBe('max');
    });

    it('does not overwrite consumer styles before the child reports a size', () => {
        render(
            <IframeResizer
                srcDoc='<!doctype html><title>Child</title>'
                style={{ border: 0, height: 240, width: '100%' }}
                title='Styled application'
            />
        );

        const iframe = screen.getByTitle<HTMLIFrameElement>('Styled application');
        expect(iframe.style.border).toBe('0px');
        expect(iframe.style.height).toBe('240px');
        expect(iframe.style.width).toBe('100%');
    });

    it('maps legacy origin and sizing props to parent connection options', () => {
        render(
            <IframeResizer
                bodyMargin='0 0 20px 0'
                checkOrigin={false}
                heightCalculationMethod='lowestElement'
                inPageLinks
                resizeFrom='child'
                srcDoc='<!doctype html><title>Child</title>'
                title='Legacy options'
            />
        );

        expect(getLatestOptions()).toMatchObject({
            allowedOrigins: 'any',
            bodyMargin: '0 0 20px 0',
            heightCalculationMethod: 'lowestElement',
            inPageLinks: true,
            resizeFrom: 'child',
        });
    });

    it('gives allowedOrigins precedence over checkOrigin', () => {
        render(
            <IframeResizer
                allowedOrigins={['https://trusted.example']}
                checkOrigin={false}
                srcDoc='<!doctype html><title>Child</title>'
                title='Origin precedence'
            />
        );

        expect(getLatestOptions().allowedOrigins).toEqual(['https://trusted.example']);
    });
});
