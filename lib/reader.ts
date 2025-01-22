import { NFC, type Reader as NFCReader } from 'nfc-pcsc'
import { log } from './logger.ts'
import { getCardRecords } from './card.ts'

export class Reader {
  #cardName
  #nfc
  #request

  constructor({
    cardName,
    debugNfc,
    request,
  }: {
    cardName: string
    debugNfc?: boolean
    request: (txt: string) => Promise<void>
  }) {
    this.#cardName = cardName
    this.#request = request
    this.#nfc = new NFC(
      debugNfc
        ? {
            log: log.debug,
            debug: log.debug,
            info: log.debug,
            warn: log.debug,
            error: log.debug,
          }
        : null
    ).on('error', (err) => log.error('NFC error:', err))
  }

  async init() {
    await this.#findReader()
  }

  async #findReader() {
    log.info('Searching for NFC readers with name:', this.#cardName)

    const reader = await new Promise<NFCReader>((resolve) =>
      this.#nfc.once('reader', (reader) => {
        const { name } = reader

        if (!name.includes(this.#cardName)) {
          log.debug('Found unwanted reader:', name)
          return
        }

        log.info(`Found reader: ${name}`)

        resolve(reader)
      })
    )

    let start = 0
    let state = 'IDLE'

    reader
      .on('card', async (card) => {
        start = Date.now()
        log.info(`card: ${card.type} - ${card.uid}`)
        log.debug(card)

        if (state === 'BUSY') {
          log.info('Busy processing a card. Skipping...')
          return
        }

        state = 'BUSY'
        for (const [record] of await getCardRecords(reader)) {
          try {
            await this.#request(record)
          } catch (err) {
            log.error('Error processing record:', err)
            break
          }
        }
        state = 'IDLE'
      })
      .on('card.off', (card) => {
        log.info(
          `card.off: ${card.type} - ${card.uid} - ${
            start ? `${Date.now() - start}ms` : ''
          }`
        )
        start = 0
      })
      .on('error', (err) => log.error(`reader error:`, err))
      .on('end', () => {
        log.info(`Reader removed: ${reader.name}`)
        reader.removeAllListeners()
        setTimeout(() => this.#findReader(), 100)
      })
  }

  onCard() {}
}
