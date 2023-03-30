import readline from 'readline'

export default (sonos, opts) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    ...opts,
  })

  rl.prompt()

  rl.on('line', async (line) => {
    try {
      const res = await sonos.process(line)
      console.error('>', res)
    } catch (err) {
      console.error('> Error', err)
    }

    rl.prompt()
  })
}
