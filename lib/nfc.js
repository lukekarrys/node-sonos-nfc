import nfcCard from 'nfccard-tool'
import { NFC } from 'nfc-pcsc'
import log from 'proc-log'

export default async (sonos, { cardName = '' } = {}) => {
  log.info('Searching for NFC readers with name:', cardName)

  await new Promise((resolve, reject) => {
    const nfc = new NFC()

    nfc.on('reader', (reader) => {
      const { name } = reader.reader

      if (!name.includes(cardName)) {
        log.silly('Found unwanted reader:', name)
        reader.on('error', () => {})
        return
      }

      log.info(`Found reader: ${name}`)

      reader.on('card', async (card) => {
        log.info(`Card: ${card.type} - ${card.uid}`)
        log.silly(card)

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
                const text = record.uri ?? record.text
                log.info(`Record: ${text}`)
                try {
                  await sonos.process(text)
                  log.info('Processed successfully')
                } catch (err) {
                  log.error(`Error processing record:`, err)
                }
              }
            }
          } catch (err) {
            log.error(`Error processing card:`, err)
          }
        } else {
          log.info('Could not parse anything from this tag')
        }
      })

      reader.on('card.off', (card) => {
        log.info(`Card removed: ${card.type} - ${card.uid}`)
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

    nfc.on('error', (err) => {
      log.error(`NFC error:`, err)
      reject(err)
      process.exit(1)
    })
  })
}
