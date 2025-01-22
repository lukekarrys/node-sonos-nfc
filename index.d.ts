declare module 'ndef-lib' {
  export const NdefMessage: {
    fromByteArray(b: Buffer): {
      getRecords(): NDEFlibRecord[]
    }
  }

  export class NDEFlibRecord {
    getType(): ArrayBuffer
    getPayload(): ArrayBuffer
  }

  export class NdefTextRecord {
    constructor()
    setPayload(b: ArrayBuffer): void
    getText(): string
    getLanguageCode(): string
  }

  export class NdefUriRecord {
    constructor()
    setPayload(b: ArrayBuffer): void
    getUri(): string
    type: string
  }
}
