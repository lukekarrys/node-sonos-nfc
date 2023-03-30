import { setTimeout } from 'timers/promises'
import log from 'proc-log'

export default class Sonos {
  #url = null
  #room = null
  #delay = 200

  constructor({ url, defaultRoom } = {}) {
    this.#url = url
    this.#room = defaultRoom
  }

  async #requestRoom(action, delay) {
    const url = `${this.#url}/${this.#room}/${action}`
    log.verbose('URL:', url)

    const res = await fetch(url)
    log.silly(res)

    if (!res.ok) {
      throw new Error(`Not ok: ${res.status} ${res.statusText}`)
    }

    if (delay) {
      log.verbose('Delay:', delay)
      await setTimeout(delay)
    }

    log.verbose('Status:', res.status)
    return res.json()
  }

  #getService(type, instruction) {
    if (type === 'apple') {
      type = 'applemusic'
    }

    switch (type) {
      case 'applemusic':
        return `applemusic/now/${instruction}`
      case 'bbcsounds':
        return `bbcsounds/play/${instruction}`
      case 'spotify':
        return `spotify/now/${instruction}`
      case 'tunein':
        return `tunein/play/${instruction}`
      case 'favorite':
        return `favorite/${instruction}`
      case 'amazonmusic':
        return `amazonmusic/now/${instruction}`
      case 'sonos_playlist':
        return `playlist/now/${instruction}`
    }
  }

  async process(cmd, { delay = this.#delay } = {}) {
    log.verbose('Raw command:', cmd)

    let command = cmd.toLowerCase()
    let clearQueue = false

    const parsedCommand = command.match(/^([^:]+):(.*)$/)

    if (parsedCommand) {
      const [, type, instruction] = parsedCommand

      log.verbose('Parsed command:', type, instruction)

      if (type === 'room') {
        this.#room = instruction
        log.info(`Current room updated to:`, this.#room)
        return { room: this.#room }
      }

      const serviceCommand = this.#getService(type, instruction)
      if (serviceCommand) {
        clearQueue = true
      }

      command = serviceCommand ?? [type, instruction].filter(Boolean).join(':')
    }

    if (clearQueue) {
      await this.#requestRoom('clearqueue', this.#delay)
    }

    return this.#requestRoom(command, delay)
  }
}
