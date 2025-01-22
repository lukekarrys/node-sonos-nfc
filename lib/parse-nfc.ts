// @ts-expect-error
import ndeflib from 'ndef-lib'

// Convert a decimal int to a hexadecimal string
// eg. number = 225 -> returns e1 - (225=0xE1)
function decimalToHexString(number: number): string {
  if (number < 0) {
    number = 0xffffffff + number + 1
  }
  return number.toString(16).toUpperCase()
}

interface TagHeaderValues {
  raw: {
    Lock: {
      LOCK0: number
      LOCK1: number
    }
    capabilityContainer: {
      MAGIC_NUMBER: number
      SPEC_VERSION: number
      MAX_NDEF_LENGTH: number
      READ_ACCESS: number
      WRITE_ACCESS: number
    }
    NDEFMessageHeader: {
      HAS_NDEF: number
      MESSAGE_LENGTH: number
    }
  }
  string: {
    Lock: {
      LOCK0: string
      LOCK1: string
    }
    capabilityContainer: {
      MAGIC_NUMBER: string
      SPEC_VERSION: string
      MAX_NDEF_LENGTH: string
      READ_ACCESS: string
      WRITE_ACCESS: string
    }
    NDEFMessageHeader: {
      HAS_NDEF: string
      MESSAGE_LENGTH: string
    }
  }
}

export class NFCCard {
  #tagHeaderValues: TagHeaderValues

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
    this.#tagHeaderValues = {
      raw: {
        Lock: {
          LOCK0: tagHeader[10]!,
          LOCK1: tagHeader[11]!,
        },
        capabilityContainer: {
          MAGIC_NUMBER: tagHeader[12]!,
          SPEC_VERSION: tagHeader[13]!,
          MAX_NDEF_LENGTH: tagHeader[14]!,
          READ_ACCESS: tagHeader[15]!,
          WRITE_ACCESS: tagHeader[15]!,
        },
        NDEFMessageHeader: {
          HAS_NDEF: tagHeader[16]!,
          MESSAGE_LENGTH: tagHeader[17]!,
        },
      },
      string: {
        Lock: {
          LOCK0: decimalToHexString(tagHeader[10]!),
          LOCK1: decimalToHexString(tagHeader[11]!),
        },
        capabilityContainer: {
          MAGIC_NUMBER: decimalToHexString(tagHeader[12]!),
          SPEC_VERSION: decimalToHexString(tagHeader[13]!),
          MAX_NDEF_LENGTH: decimalToHexString(tagHeader[14]!),
          READ_ACCESS: decimalToHexString(tagHeader[15]!),
          WRITE_ACCESS: decimalToHexString(tagHeader[15]!),
        },
        NDEFMessageHeader: {
          HAS_NDEF: decimalToHexString(tagHeader[16]!),
          MESSAGE_LENGTH: decimalToHexString(tagHeader[17]!),
        },
      },
    }
  }

  // index 12 - NDEF FORMAT
  isFormatedAsNDEF(): boolean {
    return this.#tagHeaderValues.raw.capabilityContainer.MAGIC_NUMBER === 0xe1
  }

  /**
   * READ/WRITE PERMISSIONS
   * NFCForum-TS-Type-2-Tag_1.1.pdf - Section 6.1 - page 20/21
   */

  // index 15 - READ PERMISSIONS - read access granted without any security. boolean
  // NFCForum-TS-Type-2-Tag_1.1.pdf - Section 6.1 - page 20/21
  hasReadPermissions(): boolean {
    return (
      (this.#tagHeaderValues.raw.capabilityContainer.READ_ACCESS! & 0xf0) >>
        4 ===
      0x00
    )
  }

  // index 16 - tag contains a NDEF message
  hasNDEFMessage(): boolean {
    return this.#tagHeaderValues.raw.NDEFMessageHeader.HAS_NDEF! === 0x03
  }

  // library custom util
  getNDEFMessageLengthToRead(): number {
    return this.#tagHeaderValues.raw.NDEFMessageHeader.MESSAGE_LENGTH! + 2
  }

  /**
   * @description converts a record as a specific type record instance of NDEF-lib
   *
   * @param {Buffer} NDEFRawMessage - a NDEF-lib parsed ndefRecord
   * @returns a specific type record instance of NDEF-lib including a "type" property as a string: T/U/android.com:pkg
   */
  parseNDEF(NDEFRawMessage: Buffer) {
    const NDEFlibRecords = new ndeflib.NdefMessage.fromByteArray(
      this.#cleanNDEFMessage(NDEFRawMessage)
    )._records

    const NDEFlibRecordsParsed: (
      | {
          NDEFLibRecord: any
          type: 'text'
          text: string
          language: string
        }
      | {
          NDEFLibRecord: any
          type: 'uri'
          uri: string
        }
      | {
          NDEFLibRecord: any
          type: 'unsupported'
        }
    )[] = []

    for (let i = 0; i < NDEFlibRecords.length; i++) {
      const NDEFlibRecord = NDEFlibRecords[i]

      // converts buffer to ascii - eg. ascii:T, arrayBuffer: [54], Buffer: 0x54
      const recordType = Buffer.from(NDEFlibRecord.getType()).toString('ascii')

      switch (recordType) {
        case 'T': {
          const NDEFlibTextRecord = new ndeflib.NdefTextRecord()
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

          const NDEFlibUriRecord = new ndeflib.NdefUriRecord()
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

  /**
   * @description Verify if message contains NDEF headers & Terminator:
   *                - hasNDEFFormat (0x03) at index 0
   *                - NDEFMessageLength (0xXX) at index 1
   *                - Terminator 0xFE at the end of array
   *              remove them if present and return the cleaned NDEF Message
   * @param {*} NDEFRawMessage
   */
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
    return NDEFRawMessageCleaned!
  }
}
