import PCSC, { type Reader } from '@tockawa/nfc-pcsc'
import { log } from './logger.ts'
import { getCardRecords } from './card.ts'

export class FindReader {
  #cardName
  #pcsc
  #request

  constructor({
    cardName,
    request,
  }: {
    cardName: string
    request: (txt: string) => Promise<void>
  }) {
    this.#cardName = cardName
    this.#request = request
    this.#pcsc = new PCSC().on('error', (err) => {
      throw new Error('PCSC error', { cause: err })
    })
  }

  async init() {
    await this.#findReader()
  }

  async #findReader() {
    log.info('Searching for NFC readers with name:', this.#cardName)

    const reader = await new Promise<Reader>((resolve) =>
      this.#pcsc.once('reader', (reader) => {
        const { name } = reader

        if (!name.includes(this.#cardName)) {
          log.debug('Found unwanted reader:', name)
          return
        }

        log.info(`Found reader: ${name}`)

        resolve(reader)
      }),
    )

    const cards = new Map<string, number>()

    reader
      .on('card', async ({ uid = '' }) => {
        cards.set(uid, Date.now())

        log.info(`card: ${uid}`)

        const records = await getCardRecords(reader)

        log.info(`records:`, records)

        for (const record of records ?? []) {
          try {
            await this.#request(record)
          } catch (err) {
            log.error(`Error processing record`, record, err)
            break
          }
        }
      })
      .on('card.off', ({ uid = '' }) => {
        const start = cards.get(uid)
        log.debug(
          `card.off: ${uid}${start ? ` - ${Date.now() - start}ms` : ''}`,
        )
        cards.delete(uid)
      })
      .on('error', (err) => log.error(`reader error:`, err))
      .on('end', () => {
        log.info(`Reader removed: ${reader.name}`)
        reader.removeAllListeners()
        setTimeout(() => this.init(), 100)
      })
  }

  onCard() {}
}
