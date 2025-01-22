import * as dotenv from 'dotenv'
import logger, { log, type Level } from './logger.ts'
import { Reader } from './reader.ts'
import { Readline } from './readline.ts'
import { Sonos } from './sonos.ts'
import { execSync } from 'child_process'

dotenv.config()

const main = async (opts: {
  cardName: string | null
  logLevel: string
  url: string
  roomName: string
  debugNfc: boolean
}) => {
  logger({ level: opts.logLevel as Level })

  log.info('SHA:', execSync('git rev-list HEAD | head -1').toString().trim())
  log.info('Date:', new Date().toLocaleString())
  for (const [k, v] of Object.entries(opts)) {
    log.info(k, v)
  }

  const sonos = new Sonos({ url: opts.url, initialRoom: opts.roomName })

  const reader =
    opts.cardName === null
      ? new Readline({
          request: async (txt) => {
            await sonos.process(txt)
          },
        })
      : new Reader({
          cardName: opts.cardName,
          debugNfc: opts.debugNfc,
          request: async (txt) => {
            await sonos.process(txt)
          },
        })

  await Promise.all([sonos.init(), reader.init()])

  log.info('READY')
}

main({
  cardName: process.env.SONOS_READLINE
    ? null
    : process.env.SONOS_CARDNAME ?? 'ACR122U',
  logLevel: process.env.SONOS_LOGLEVEL ?? 'info',
  url: process.env.SONOS_URL ?? 'http://192.168.7.14:5005',
  roomName: process.env.SONOS_ROOM ?? 'office',
  debugNfc: process.env.DEBUG_NFC == 'true',
}).catch((err) => {
  log.error(err)
  process.exitCode = 1
})
