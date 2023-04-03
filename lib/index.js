import * as dotenv from 'dotenv'
import logger from './logger.js'
import nfc from './nfc.js'
import readline from './readline.js'
import Sonos from './sonos.js'
import log from 'proc-log'
import { execSync } from 'child_process'

dotenv.config()

const {
  SONOS_READLINE,
  SONOS_CARDNAME = 'ACR122U',
  SONOS_LOGLEVEL = 'info',
  SONOS_URL = 'http://hummingbird.local:5005',
  SONOS_ROOM = 'Office',
} = process.env

const main = async ({ logLevel, url, roomName, cardName, debugNfc }) => {
  logger({ level: logLevel })

  log.info('SHA:', execSync('git rev-list HEAD | head -1').toString())
  log.info('Date:', new Date().toJSON())
  log.info({ logLevel, url, roomName, cardName, debugNfc })

  const sonos = new Sonos({ url })
  await sonos.setRoom(roomName)

  if (cardName != null) {
    await nfc(sonos, { cardName, debugNfc })
  } else {
    readline(sonos, { prompt: 'sonos > ' })
  }
}

main({
  cardName: SONOS_READLINE ? null : SONOS_CARDNAME,
  logLevel: SONOS_LOGLEVEL,
  url: SONOS_URL,
  roomName: SONOS_ROOM,
}).catch((err) => {
  log.error(err)
  process.exitCode = 1
})
