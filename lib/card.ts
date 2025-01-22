import { NFCCard } from './parse-nfc.ts'
import { log } from './logger.ts'
import { type Reader as NFCReader } from '@tockawa/nfc-pcsc'

const parseCard = async (reader: NFCReader) => {
  let header: Buffer | null = null
  try {
    header = await reader.read(0, 20)
  } catch (err) {
    throw new Error('Error reading card header', { cause: err })
  }

  if (!header) {
    throw new Error('Could not read header from card')
  }

  const card = new NFCCard(header)

  const isFormatedAsNDEF = card.isFormatedAsNDEF()
  const hasReadPermissions = card.hasReadPermissions()
  const hasNDEFMessage = card.hasNDEFMessage()

  if (isFormatedAsNDEF && hasReadPermissions && hasNDEFMessage) {
    return card
  }

  throw new Error('Could not parse any NDEF messages from this tag', {
    cause: {
      isFormatedAsNDEF,
      hasReadPermissions,
      hasNDEFMessage,
    },
  })
}

const readCard = async (reader: NFCReader, card: NFCCard) => {
  let NDEFRawMessage: Buffer | null = null
  try {
    NDEFRawMessage = await reader.read(4, card.getNDEFMessageLengthToRead())
  } catch (err) {
    throw new Error(`Error reading card`, { cause: err })
  }

  if (!NDEFRawMessage) {
    throw new Error('Could not read NDEF message from card')
  }

  const records = card.parseNDEF(NDEFRawMessage).map((raw) => ({
    type: raw.type,
    value: raw.type === 'text' ? raw.text : raw.type === 'uri' ? raw.uri : null,
    raw,
  }))

  if (records.some(({ value }) => !value)) {
    throw new Error('Could not parse some records as uri or text', {
      cause: { records },
    })
  }

  log.debug('Records', records)

  return records.map(({ value }) => value).filter((v) => v !== null)
}

export const getCardRecords = async (reader: NFCReader) => {
  try {
    const card = await parseCard(reader)
    return await readCard(reader, card)
  } catch {
    return []
  }
}
