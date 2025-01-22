declare module 'nfc-pcsc' {
  export type ListenerSignature<L> = {
    [E in keyof L]: (...args: any[]) => any
  }

  export type DefaultListener = {
    [k: string]: (...args: any[]) => any
  }

  export class TypedEmitter<L extends ListenerSignature<L> = DefaultListener> {
    static defaultMaxListeners: number
    addListener<U extends keyof L>(event: U, listener: L[U]): this
    prependListener<U extends keyof L>(event: U, listener: L[U]): this
    prependOnceListener<U extends keyof L>(event: U, listener: L[U]): this
    removeListener<U extends keyof L>(event: U, listener: L[U]): this
    removeAllListeners(event?: keyof L): this
    once<U extends keyof L>(event: U, listener: L[U]): this
    on<U extends keyof L>(event: U, listener: L[U]): this
    off<U extends keyof L>(event: U, listener: L[U]): this
    emit<U extends keyof L>(event: U, ...args: Parameters<L[U]>): boolean
    eventNames<U extends keyof L>(): U[]
    listenerCount(type: keyof L): number
    listeners<U extends keyof L>(type: U): L[U][]
    rawListeners<U extends keyof L>(type: U): L[U][]
    getMaxListeners(): number
    setMaxListeners(n: number): this
  }

  type Type = 'TAG_ISO_14443_3' | 'TAG_ISO_14443_4'

  const KEY_TYPE_A = 0x60
  const KEY_TYPE_B = 0x61

  interface Card {
    type: Type
    standard: Type
    uid?: string
    data?: Buffer
  }

  interface ReaderEmitter {
    card: (x: Card) => void
    'card.off': (x: Card) => void
    error: (x: Error) => void
    end: () => void
  }

  interface Logger {
    log(...args: any[]): void
    debug(...args: any[]): void
    info(...args: any[]): void
    warn(...args: any[]): void
    error(...args: any[]): void
  }

  export class Reader extends TypedEmitter<ReaderEmitter> {
    get name(): string

    authenticate(
      blockNumber: number,
      keyType: number,
      key: string,
      obsolete?: boolean
    ): Promise<boolean>

    read(
      blockNumber: number,
      length: number,
      blockSize?: number,
      packetSize?: number,
      readClass?: number
    ): Promise<Buffer>
  }

  interface NFCEmitter {
    reader: (reader: Reader) => void
    error: (error: Error) => void
  }

  export class NFC extends TypedEmitter<NFCEmitter> {
    constructor(logger: Logger | null)
  }
}

declare module 'nfccard-tool' {
  import { Buffer } from 'buffer'

  interface LockValues {
    LOCK0: number
    LOCK1: number
  }

  interface CapabilityContainer {
    MAGIC_NUMBER: number
    SPEC_VERSION: number
    MAX_NDEF_LENGTH: number
    READ_ACCESS: number
    WRITE_ACCESS: number
  }

  interface NDEFMessageHeader {
    HAS_NDEF: number
    MESSAGE_LENGTH: number
  }

  interface RawHeaderValues {
    Lock: LockValues
    capabilityContainer: CapabilityContainer
    NDEFMessageHeader: NDEFMessageHeader
  }

  interface StringHeaderValues {
    Lock: LockValues
    capabilityContainer: CapabilityContainer
    NDEFMessageHeader: NDEFMessageHeader
  }

  interface HeaderValues {
    raw: RawHeaderValues
    string: StringHeaderValues
  }

  interface ParsedHeader {
    isFormatedAsNDEF: boolean
    type2SpecVersion: string
    maxNDEFMessageSize: number
    hasReadPermissions: boolean
    getReadPermissionsType: string
    hasWritePermissions: boolean
    writePermissionsType: string
    hasNDEFMessage: boolean
    NDEFMessageLength: number
    lengthToReadFromBlock4: number
  }

  interface ParsedInfo {
    headerValues: HeaderValues
    parsedHeader: ParsedHeader
  }

  interface NDEFRecord {
    type: string
    NDEFlibRecord: {
      getPayload(): number[]
    }
    [key: string]: any
  }

  export class NFCCard {
    constructor()

    getHeaderRawValues(blocks0to6: Buffer): HeaderValues
    isStaticallyLocked(): boolean
    isFormatedAsNDEF(): boolean
    getType2SpecVersion(): string
    getMaxNDEFMessageLength(): number
    hasReadPermissions(): boolean
    getReadPermissionsType(): string
    hasWritePermissions(): boolean
    getWritePermissionsType(): string
    hasNDEFMessage(): boolean
    getNDEFMessageLength(): number
    getNDEFMessageLengthToRead(): number
    isInitialized(): boolean
    isReadWrite(): boolean
    isReadOnly(): boolean
    parseHeader(): ParsedHeader
    parseInfo(blocks0to6: Buffer): ParsedInfo
    parseNDEF(NDEFRawMessage: any): NDEFRecord[]
    cleanNDEFMessage(NDEFRawMessage: any): any
    prepareNDEFMessage(recordsToPrepare: NDEFRecord[]): any
    prepareBytesToWrite(message: NDEFRecord[]): any
  }

  export = InstanceType<NFCCard>
}
