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

  async #request(path, delay) {
    const url = `${this.#url}/${path}`
    log.info('URL:', url)

    const res = await fetch(url)
    log.silly(res)

    if (!res.ok) {
      const errorText = await res
        .json()
        .then((r) => JSON.stringify(r))
        .catch(() => res.statusText)
      throw new Error(`Not ok: ${res.status} ${errorText}`)
    }

    if (delay) {
      log.verbose('Delay:', delay)
      await setTimeout(delay)
    }

    log.verbose('Status:', res.status)
    return res.json()
  }

  async #requestRoom(action, delay) {
    return this.#request(`${this.#room}/${action}`, delay)
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

  #parseText(cmd) {
    cmd = cmd.toLowerCase()

    let url

    try {
      url = new URL(cmd)
      if (url.origin === 'null') {
        throw new Error('Invalid URL')
      }
    } catch {
      return cmd
    }

    if (url.host === 'music.apple.com') {
      const [, ...paths] = url.pathname.split('/')
      if (paths.at(1) === 'album') {
        return `apple:album:${paths.at(-1)}`
      }
    }

    throw new Error(`No defined action for url: ${cmd}`)
  }

  async #setRoom(roomName) {
    const names = await this.#request('zones').then((rooms) =>
      rooms.map((r) => encodeURIComponent(r.roomName))
    )

    if (!names.includes(roomName)) {
      throw new Error(
        `Could not set room name to ${roomName}. Must be one of: ${names.join(
          ', '
        )}`
      )
    }

    this.#room = roomName
    this.log.info(`Current room updated to:`, this.#room)
    return { room: this.#room }
  }

  async process(cmd, { delay = this.#delay } = {}) {
    log.info('Command:', cmd)

    let command = this.#parseText(cmd)

    if (command.startsWith('room:')) {
      return this.#setRoom(command.replace(/^room:/, ''))
    }

    let clearQueue = false
    const parsedCommand = command.match(/^([^:]+):(.*)$/)

    if (parsedCommand) {
      const [, type, instruction] = parsedCommand

      log.verbose('Parsed command:', type, instruction)

      const serviceCommand = this.#getService(type, instruction)
      if (serviceCommand) {
        clearQueue = true
        command = serviceCommand
      }
    }

    if (clearQueue) {
      await this.#requestRoom('clearqueue', this.#delay)
    }
    return this.#requestRoom(command, delay)
  }
}
