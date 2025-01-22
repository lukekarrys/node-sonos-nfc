import ndeflib_ from 'ndef-lib'
const { NdefMessage, NdefTextRecord, NdefUriRecord } = ndeflib_

const ensureByte = (buf: Buffer, index: number): number => {
  const b = buf[index]
  if (b === undefined) {
    throw new Error(`Buffer index ${index} not found`)
  }
  return b
}

type ParsedRecord =
  | {
      NDEFLibRecord: unknown
      type: 'text'
      text: string
      language: string
    }
  | {
      NDEFLibRecord: unknown
      type: 'uri'
      uri: string
    }
  | {
      NDEFLibRecord: unknown
      type: 'unsupported'
    }

export class NFCCard {
  #MAGIC_NUMBER: number
  #READ_ACCESS: number
  #HAS_NDEF: number
  #MESSAGE_LENGTH: number

  /**
   * @description entry point for the user wanting to parse any parsable tag information
   * @param {Buffer} tagHeader
   */
  constructor(tagHeader: Buffer) {
    // RFU
    // Block 0
    // Block 1
    // RFU
    // Block 2
    // http://apps4android.org/nfc-specifications/NFCForum-TS-Type-2-Tag_1.1.pdf - page 20
    this.#MAGIC_NUMBER = ensureByte(tagHeader, 12)
    this.#READ_ACCESS = ensureByte(tagHeader, 15)
    this.#HAS_NDEF = ensureByte(tagHeader, 16)
    this.#MESSAGE_LENGTH = ensureByte(tagHeader, 17)
  }

  isFormatedAsNDEF(): boolean {
    return this.#MAGIC_NUMBER === 0xe1
  }

  hasReadPermissions(): boolean {
    return (this.#READ_ACCESS & 0xf0) >> 4 === 0x00
  }

  hasNDEFMessage(): boolean {
    return this.#HAS_NDEF === 0x03
  }

  getNDEFMessageLengthToRead(): number {
    return this.#MESSAGE_LENGTH + 2
  }

  parseNDEF(NDEFRawMessage: Buffer) {
    const NDEFlibRecords = NdefMessage.fromByteArray(
      this.#cleanNDEFMessage(NDEFRawMessage),
    ).getRecords()

    const NDEFlibRecordsParsed: ParsedRecord[] = []

    for (const NDEFlibRecord of NDEFlibRecords) {
      // converts buffer to ascii - eg. ascii:T, arrayBuffer: [54], Buffer: 0x54
      const recordType = Buffer.from(NDEFlibRecord.getType()).toString('ascii')

      switch (recordType) {
        case 'T': {
          const NDEFlibTextRecord = new NdefTextRecord()
          NDEFlibTextRecord.setPayload(NDEFlibRecord.getPayload())
          NDEFlibRecordsParsed.push({
            NDEFLibRecord: NDEFlibTextRecord,
            type: 'text',
            text: NDEFlibTextRecord.getText(),
            language: NDEFlibTextRecord.getLanguageCode(),
          })
          break
        }

        case 'U': {
          /**
           * There are several sub-types of Uri records but we only parse as standard Uri record
           * Types supported by NDEF-lib:
           *    NdefTelRecord (tel:PhoneNumber)
           *    NdefGeoRecord (geo:Long,Lat)
           *    NdefSocialRecord (http://SocialWebsite/Username)
           */

          const NDEFlibUriRecord = new NdefUriRecord()
          NDEFlibUriRecord.setPayload(NDEFlibRecord.getPayload())
          NDEFlibUriRecord.type = 'U'
          NDEFlibRecordsParsed.push({
            NDEFLibRecord: NDEFlibUriRecord,
            type: 'uri',
            uri: NDEFlibUriRecord.getUri(),
          })
          break
        }

        default:
          NDEFlibRecordsParsed.push({
            NDEFLibRecord: NDEFlibRecord,
            type: 'unsupported',
          })
          break
      }
    }

    return NDEFlibRecordsParsed
  }

  #cleanNDEFMessage(NDEFRawMessage: Buffer): Buffer {
    let NDEFRawMessageCleaned: Buffer | null = null
    // Assume it's not the message yet but a read starting at block 4
    // We slice the 2 first index
    if (NDEFRawMessage[0] === 0x03) {
      NDEFRawMessageCleaned = NDEFRawMessage.slice(2)
    }
    if (NDEFRawMessage[NDEFRawMessage.length - 1] === 0xfe) {
      NDEFRawMessageCleaned = NDEFRawMessage.slice(0, -1)
    }
    if (!NDEFRawMessageCleaned) {
      throw new Error('Could not clean NDEF message', {
        cause: { NDEFRawMessage },
      })
    }
    return NDEFRawMessageCleaned
  }
}
