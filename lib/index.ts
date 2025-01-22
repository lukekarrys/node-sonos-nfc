import * as dotenv from 'dotenv'
import logger, { log, type Level } from './logger.ts'
import { FindReader } from './reader.ts'
import { Sonos } from './sonos.ts'
import { execSync } from 'child_process'
import { createInterface } from 'readline/promises'

dotenv.config()

const main = async (opts: {
  cardName: string | null
  logLevel: string
  host: string
  roomName: string
  dryRun?: boolean
}) => {
  logger({ level: opts.logLevel as Level })

  log.info('SHA:', execSync('git rev-list HEAD | head -1').toString().trim())
  log.info('Date:', new Date().toLocaleString())
  for (const [k, v] of Object.entries(opts)) {
    log.info(k, v)
  }

  const sonos = new Sonos({
    host: opts.host,
    initialRoom: opts.roomName,
    dryRun: opts.dryRun,
  })

  try {
    await sonos.init()
  } catch (err) {
    if (
      err instanceof Error &&
      err.cause instanceof Error &&
      'code' in err.cause &&
      err.cause.code === 'ECONNREFUSED' &&
      !opts.dryRun
    ) {
      throw new Error(
        `Connection refused to ${opts.host}. Make sure server is running.`,
      )
    }
  }

  const request = async (txt: string) => void (await sonos.process(txt))

  if (opts.cardName) {
    await new FindReader({ cardName: opts.cardName, request }).init()
    log.info('READY')
    return
  }

  const rl = createInterface(process.stdin, process.stdout)

  while (true) {
    try {
      const line = await rl.question('sonos > ')
      await request(line)
    } catch (err) {
      log.error(err)
    }
  }
}

await main({
  cardName:
    process.env.SONOS_READLINE ?
      null
    : (process.env.SONOS_CARDNAME ?? 'ACR122U'),
  logLevel: process.env.SONOS_LOGLEVEL ?? 'info',
  host: process.env.SONOS_HOST ?? 'http://192.168.7.14:5005',
  roomName: process.env.SONOS_ROOM ?? 'office',
  dryRun: process.env.SONOS_DRYRUN === 'true',
})
