import readline from 'readline'

export class Readline {
  #rl

  constructor({ request }: { request: (line: string) => Promise<void> }) {
    this.#rl = readline
      .createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'sonos > ',
      })
      .on('line', async (line) => {
        try {
          const res = await request(line)
          console.error('> ok')
        } catch (err) {
          console.error('> Error', err)
        }

        this.#rl.prompt()
      })
  }

  async init() {
    await setImmediate(() => this.#rl.prompt())
  }
}
