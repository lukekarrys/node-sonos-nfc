import { createInterface } from 'readline'
import { log } from './logger.ts'

export const readline = ({
  request,
}: {
  request: (line: string) => Promise<void>
}) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sonos > ',
  })

  rl.on('line', async (line) => {
    try {
      await request(line)
    } catch (err) {
      log.error(err)
    }

    rl.prompt()
  })

  rl.prompt()
}
