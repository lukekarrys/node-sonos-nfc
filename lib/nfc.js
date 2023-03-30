import { setTimeout } from 'timers/promises'
import nfcCard from 'nfccard-tool'
import { NFC } from 'nfc-pcsc'
import log from 'proc-log'

const nfcLogger = ['log', 'debug', 'info', 'warn', 'error'].reduce(
  (acc, key) => ((acc[key] = (...args) => log.silly('NFC', ...args)), acc),
  {}
)

const processNfcCard = async (sonos) => {
  try {
    const cardHeader = await reader.read(0, 20)
    nfcCard.parseInfo(cardHeader)
  } catch (err) {
    log.error('Error reading/parsing card header:', err)
    return
  }

  if (
    nfcCard.isFormatedAsNDEF() &&
    nfcCard.hasReadPermissions() &&
    nfcCard.hasNDEFMessage()
  ) {
    try {
      const NDEFRawMessage = await reader.read(
        4,
        nfcCard.getNDEFMessageLengthToRead()
      )
      const NDEFMessage = nfcCard.parseNDEF(NDEFRawMessage)

      for (const record of NDEFMessage) {
        if (['uri', 'text'].includes(record.type)) {
          try {
            const res = await sonos.process(record.uri ?? record.text)
            log.info(res)
          } catch (err) {
            log.error(`Error processing record:`, err)
          }
        }
      }
    } catch (err) {
      log.error(`Error processing card:`, err)
    }
  } else {
    log.info('Could not parse any NDEF messages from this tag')
  }
}

export default (sonos, { cardName = '', debugNfc = false } = {}) =>
  new Promise((resolve, reject) => {
    log.info('Searching for NFC readers with name:', cardName)

    const nfc = new NFC(debugNfc ? nfcLogger : null)
    const ac = new AbortController()

    const onError = (err, exit) => {
      log.error(err)
      nfc.removeAllListeners()
      ac.abort(err)
      reject(err)
      if (typeof exit === 'number') {
        process.exit(exit)
      }
    }

    setTimeout(2000, new Error('Timed out waiting for reader'), ac)
      .then(onError)
      .catch(() => null)

    nfc.on('error', onError)

    nfc.on('reader', (reader) => {
      const { name } = reader.reader

      if (!name.includes(cardName)) {
        log.silly('Found unwanted reader:', name)
        reader.on('error', () => {})
        return
      }

      ac.abort('Found a reader')
      log.info(`Found reader: ${name}`)
      log.silly(reader)

      reader.on('card', async (card) => {
        log.info(`Card: ${card.type} - ${card.uid}`)
        log.silly(card)
        await processNfcCard(sonos)
      })

      reader.on('card.off', (card) =>
        log.verbose(`Card removed: ${card.type} - ${card.uid}`)
      )

      reader.on('error', (err) => log.error(`Reader error ${name}:`, err))

      reader.on('end', () =>
        onError(new Error(`${name} device removed. Exiting...`), 1)
      )

      resolve(reader)
    })
  })
