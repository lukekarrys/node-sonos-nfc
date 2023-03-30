import * as dotenv from 'dotenv'
import logger from './logger.js'
import nfc from './nfc.js'
import readline from './readline.js'
import Sonos from './sonos.js'
import log from 'proc-log'

dotenv.config()

const main = async ({ logLevel, url, roomName, cardName, debugNfc }) => {
  logger({ level: logLevel })

  const sonos = new Sonos({ url })
  await sonos.setRoom(roomName)

  if (cardName != null) {
    await nfc(sonos, { cardName, debugNfc })
  } else {
    readline(sonos, { prompt: 'sonos > ' })
  }
}

main({
  cardName: 'ACR122U',
  logLevel: process.env.SONOS_LOGLEVEL ?? 'info',
  url: process.env.SONOS_URL ?? 'http://hummingbird.local:5005',
  roomName: process.env.SONOS_ROOM ?? 'Office',
}).catch((err) => {
  log.error(err)
  process.exitCode = 1
})
