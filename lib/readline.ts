import { createInterface } from 'readline/promises'
import { log } from './logger.ts'

export const readline = async ({
  request,
}: {
  request: (line: string) => Promise<void>
}) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  while (true) {
    try {
      const line = await rl.question('sonos > ')
      await request(line)
    } catch (err) {
      log.error(err)
    }
  }
}
