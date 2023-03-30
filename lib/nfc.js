import { setTimeout } from 'timers/promises'
import nfcCard from 'nfccard-tool'
import { NFC } from 'nfc-pcsc'
import log from 'proc-log'

const silly = (...args) => log.silly('NFC', ...args)

export default (sonos, { cardName = '', debugNfc = false } = {}) =>
  new Promise((resolve, reject) => {
    log.info('Searching for NFC readers with name:', cardName)

    const nfc = new NFC(
      debugNfc
        ? {
            log: silly,
            debug: silly,
            info: silly,
            warn: silly,
            error: silly,
          }
        : null
    )

    const ac = new AbortController()

    const onError = (err) => {
      nfc.removeAllListeners()
      ac.abort()
      reject(err)
    }

    setTimeout(2000, { signal: ac.signal }).then(() => {
      onError(new Error('Timed out waiting for reader'))
    })

    nfc.on('error', (err) => {
      onError(err)
    })

    nfc.on('reader', (reader) => {
      const { name } = reader.reader

      if (!name.includes(cardName)) {
        log.silly('Found unwanted reader:', name)
        reader.on('error', () => {})
        return
      }

      ac.abort()
      log.info(`Found reader: ${name}`)
      log.silly(reader)

      reader.on('card', async (card) => {
        log.info(`Card: ${card.type} - ${card.uid}`)
        log.silly(card)

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
      })

      reader.on('card.off', (card) => {
        log.verbose(`Card removed: ${card.type} - ${card.uid}`)
      })

      reader.on('error', (err) => {
        log.error(`Reader error ${name}:`, err)
      })

      reader.on('end', () => {
        log.error(`${name} device removed. Exiting...`)
        process.exit(1)
      })

      resolve(reader)
    })
  })
