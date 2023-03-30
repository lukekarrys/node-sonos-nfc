import * as dotenv from 'dotenv'
import logger from './logger.js'
import nfc from './nfc.js'
import readline from './readline.js'
import Sonos from './sonos.js'

dotenv.config()

const main = async ({ logLevel, url, defaultRoom, cardName }) => {
  logger({ level: logLevel })

  const sonos = new Sonos({ url, defaultRoom })

  if (cardName) {
    await nfc(sonos, { cardName })
  } else {
    readline(sonos, { prompt: 'sonos > ' })
  }
}

main({
  // logLevel: 'verbose',
  cardName: 'ACR122U',
  url: 'http://hummingbird.local:5005',
  defaultRoom: process.env.SONOS_ROOM ?? 'Office',
})
