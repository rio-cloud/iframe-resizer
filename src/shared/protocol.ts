export const IFRAME_RESIZER_PROTOCOL = '@rio-cloud/iframe-resizer';
export const IFRAME_RESIZER_PROTOCOL_VERSION = 1;

export type ResizeDirection = 'vertical' | 'horizontal' | 'both';
export type ResizeFrom = 'child' | 'parent';
export type HeightCalculationMethod =
    | 'auto'
    | 'bodyOffset'
    | 'bodyScroll'
    | 'documentElementOffset'
    | 'documentElementScroll'
    | 'grow'
    | 'lowestElement'
    | 'max'
    | 'min'
    | 'taggedElement';

const HEIGHT_CALCULATION_METHODS: readonly HeightCalculationMethod[] = [
    'auto',
    'bodyOffset',
    'bodyScroll',
    'documentElementOffset',
    'documentElementScroll',
    'grow',
    'lowestElement',
    'max',
    'min',
    'taggedElement',
];

export const isHeightCalculationMethod = (value: unknown): value is HeightCalculationMethod =>
    typeof value === 'string' && HEIGHT_CALCULATION_METHODS.includes(value as HeightCalculationMethod);

export type FrameSize = {
    height: number;
    width: number;
};

export type ResizeReason = 'connect' | 'document-load' | 'font-load' | 'manual' | 'mutation' | 'resize-observer';

type ProtocolMessage = {
    protocol: typeof IFRAME_RESIZER_PROTOCOL;
    type: string;
    version: typeof IFRAME_RESIZER_PROTOCOL_VERSION;
};

export type DiscoverMessage = ProtocolMessage & {
    type: 'discover';
};

export type ReadyMessage = ProtocolMessage & {
    type: 'ready';
};

export type ConnectMessage = ProtocolMessage & {
    bodyMargin?: string | number | null;
    type: 'connect';
    direction: ResizeDirection;
    frameId: string;
    heightCalculationMethod?: HeightCalculationMethod;
    resizeFrom?: ResizeFrom;
};

export type ConnectedMessage = ProtocolMessage & {
    type: 'connected';
    frameId: string;
};

export type ResizeMessage = ProtocolMessage & {
    type: 'resize';
    frameId: string;
    reason: ResizeReason;
    size: FrameSize;
};

export type ResizeRequestMessage = ProtocolMessage & {
    type: 'resize-request';
};

export type DataMessage = ProtocolMessage & {
    type: 'message';
    data: unknown;
};

export type DisconnectMessage = ProtocolMessage & {
    type: 'disconnect';
};

export type WindowProtocolMessage = ConnectMessage | DiscoverMessage | ReadyMessage;
export type PortProtocolMessage =
    | ConnectedMessage
    | DataMessage
    | DisconnectMessage
    | ResizeMessage
    | ResizeRequestMessage;

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> => typeof value === 'object' && value !== null;

export const isProtocolMessage = (value: unknown): value is ProtocolMessage & Record<PropertyKey, unknown> =>
    isRecord(value) &&
    value.protocol === IFRAME_RESIZER_PROTOCOL &&
    value.version === IFRAME_RESIZER_PROTOCOL_VERSION &&
    typeof value.type === 'string';

export const isReadyMessage = (value: unknown): value is ReadyMessage =>
    isProtocolMessage(value) && value.type === 'ready';

export const isDiscoverMessage = (value: unknown): value is DiscoverMessage =>
    isProtocolMessage(value) && value.type === 'discover';

export const isConnectMessage = (value: unknown): value is ConnectMessage =>
    isProtocolMessage(value) &&
    value.type === 'connect' &&
    typeof value.frameId === 'string' &&
    (value.direction === 'vertical' || value.direction === 'horizontal' || value.direction === 'both');

export const isConnectedMessage = (value: unknown): value is ConnectedMessage =>
    isProtocolMessage(value) && value.type === 'connected' && typeof value.frameId === 'string';

export const isResizeMessage = (value: unknown): value is ResizeMessage =>
    isProtocolMessage(value) &&
    value.type === 'resize' &&
    typeof value.frameId === 'string' &&
    typeof value.reason === 'string' &&
    isRecord(value.size) &&
    Number.isFinite(value.size.height) &&
    Number.isFinite(value.size.width);

export const isResizeRequestMessage = (value: unknown): value is ResizeRequestMessage =>
    isProtocolMessage(value) && value.type === 'resize-request';

export const isDataMessage = (value: unknown): value is DataMessage =>
    isProtocolMessage(value) && value.type === 'message' && 'data' in value;

export const isDisconnectMessage = (value: unknown): value is DisconnectMessage =>
    isProtocolMessage(value) && value.type === 'disconnect';

export const createProtocolMessage = <Message extends ProtocolMessage>(
    message: Omit<Message, 'protocol' | 'version'>
): Message =>
    ({
        protocol: IFRAME_RESIZER_PROTOCOL,
        version: IFRAME_RESIZER_PROTOCOL_VERSION,
        ...message,
    }) as Message;
