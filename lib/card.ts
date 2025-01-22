import nfcCard, { type NFCCard } from 'nfccard-tool'
import { log } from './logger.ts'
import { type Reader as NFCReader } from 'nfc-pcsc'

const parseCard = async (reader: NFCReader) => {
  let header
  try {
    header = await reader.read(0, 20)
  } catch (err) {
    throw new Error('Error reading card header', { cause: err })
  }

  const card = new nfcCard.constructor()
  card.parseInfo(header)

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
  try {
    const NDEFRawMessage = await reader.read(
      4,
      card.getNDEFMessageLengthToRead()
    )
    const records = card.parseNDEF(NDEFRawMessage).map((raw) => [
      raw.uri ??
        raw.text ??
        raw.NDEFlibRecord.getPayload()
          .map((v) => String.fromCharCode(v as number))
          .join(''),
      raw,
    ])
    log.debug('Records', records)
    return records
  } catch (err) {
    throw new Error(`Error reading card`, { cause: err })
  }
}

export const getCardRecords = async (reader: NFCReader) => {
  try {
    const card = await parseCard(reader)
    return await readCard(reader, card)
  } catch {
    return []
  }
}
