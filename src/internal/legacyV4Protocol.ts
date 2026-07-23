import type { HeightCalculationMethod, ResizeDirection, ResizeFrom } from '../shared/protocol.js';
import { isHeightCalculationMethod } from '../shared/protocol.js';

const LEGACY_V4_PREFIX = '[iFrameSizer]';

export type LegacyV4Message = {
    frameId: string;
    height: number;
    payload: string | undefined;
    trigger: string;
    width: number;
};

export type LegacyV4ParentMessage =
    | {
          calculateWidth: boolean;
          bodyMargin: string | null;
          frameId: string;
          heightCalculationMethod: HeightCalculationMethod;
          resizeFrom: ResizeFrom;
          type: 'init';
      }
    | {
          payload: string | undefined;
          type: 'message' | 'reset' | 'resize';
      };

const parseDimension = (value: string | undefined): number | undefined => {
    if (value === undefined || value === '') {
        return undefined;
    }

    const dimension = Number.parseFloat(value);
    return Number.isFinite(dimension) ? dimension : undefined;
};

type LegacyV4InitOptions = {
    bodyMargin: string | number | null | undefined;
    direction: ResizeDirection;
    frameId: string;
    heightCalculationMethod: HeightCalculationMethod;
    resizeFrom: ResizeFrom;
};

const serializeBodyMargin = (bodyMargin: string | number | null | undefined): string => {
    if (bodyMargin === null || bodyMargin === undefined) {
        return 'null';
    }

    return typeof bodyMargin === 'number' ? `${bodyMargin}px` : bodyMargin;
};

export const createLegacyV4InitMessage = ({
    bodyMargin,
    direction,
    frameId,
    heightCalculationMethod,
    resizeFrom,
}: LegacyV4InitOptions): string => {
    const calculateWidth = direction !== 'vertical';
    const legacyHeightCalculationMethod = heightCalculationMethod === 'auto' ? 'bodyOffset' : heightCalculationMethod;

    return [
        `${LEGACY_V4_PREFIX}${frameId}`,
        '8',
        String(calculateWidth),
        'false',
        '32',
        'true',
        'true',
        serializeBodyMargin(bodyMargin),
        legacyHeightCalculationMethod,
        'null',
        'null',
        '0',
        'false',
        resizeFrom,
        'scroll',
        'false',
    ].join(':');
};

export const createLegacyV4Command = (command: 'message' | 'resize', data?: unknown): string => {
    if (command === 'message') {
        return `${LEGACY_V4_PREFIX}message:${JSON.stringify(data)}`;
    }

    return `${LEGACY_V4_PREFIX}resize`;
};

export const createLegacyV4ChildMessage = (
    frameId: string,
    height: number,
    width: number,
    trigger: string,
    data?: unknown
): string => {
    const payload = data === undefined ? '' : `:${JSON.stringify(data)}`;
    return `${LEGACY_V4_PREFIX}${frameId}:${height}:${width}:${trigger}${payload}`;
};

export const parseLegacyV4ParentMessage = (value: unknown): LegacyV4ParentMessage | undefined => {
    if (typeof value !== 'string' || !value.startsWith(LEGACY_V4_PREFIX)) {
        return undefined;
    }

    const message = value.slice(LEGACY_V4_PREFIX.length);
    const [typeOrFrameId, ...data] = message.split(':');

    if (typeOrFrameId && data.length >= 15 && (data[1] === 'true' || data[1] === 'false')) {
        return {
            calculateWidth: data[1] === 'true',
            bodyMargin: data[6] === undefined || data[6] === 'null' ? null : data[6],
            frameId: typeOrFrameId ?? '',
            heightCalculationMethod: isHeightCalculationMethod(data[7]) ? data[7] : 'bodyOffset',
            resizeFrom: data[12] === 'child' ? 'child' : 'parent',
            type: 'init',
        };
    }

    if (typeOrFrameId === 'message' || typeOrFrameId === 'reset' || typeOrFrameId === 'resize') {
        return {
            payload: data.length > 0 ? data.join(':') : undefined,
            type: typeOrFrameId,
        };
    }

    return undefined;
};

export const parseLegacyV4Message = (value: unknown): LegacyV4Message | undefined => {
    if (typeof value !== 'string' || !value.startsWith(LEGACY_V4_PREFIX)) {
        return undefined;
    }

    const [frameId, rawHeight, rawWidth, trigger, ...payload] = value.slice(LEGACY_V4_PREFIX.length).split(':');
    const height = parseDimension(rawHeight);
    const width = parseDimension(rawWidth);

    if (!frameId || height === undefined || width === undefined || !trigger) {
        return undefined;
    }

    return {
        frameId,
        height,
        payload: payload.length > 0 ? payload.join(':') : undefined,
        trigger,
        width,
    };
};
