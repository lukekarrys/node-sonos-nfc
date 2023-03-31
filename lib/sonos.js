import { setTimeout } from 'timers/promises'
import log from 'proc-log'

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

export default class Sonos {
  #url = null
  #room = null
  #delay = 200
  #sep = ':'

  constructor({ url } = {}) {
    this.#url = url
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
    if (!this.#room) {
      throw new Error('Room must be set by calling `setRoom(name)`')
    }
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
    cmd = cmd.toLowerCase().trim()

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
        return ['apple', 'album', paths.at(-1)].join(this.#sep)
      }
    }

    throw new Error(`No defined action for url: ${cmd}`)
  }

  async setRoom(roomName) {
    const names = await this.#request('zones').then((rooms) =>
      rooms.map((r) => encodeURIComponent(r.coordinator.roomName))
    )

    if (!names.includes(roomName)) {
      throw new Error(
        `Could not set room name to ${roomName}. Must be one of: ${names}`
      )
    }

    this.#room = roomName
    log.info(`Current room updated to:`, this.#room)

    return { room: this.#room }
  }

  async shuffleQueue() {
    const queue = await this.#requestRoom('queue').then((r) => r.length)
    const shuffle = await this.#requestRoom('state').then(
      (r) => !r.playMode.shuffle
    )

    log.verbose('Shuffle queue:', queue, shuffle)

    await this.#requestRoom('pause', this.#delay)

    if (shuffle) {
      await this.#requestRoom(`trackseek/${random(0, queue)}`, this.#delay)
      await this.#requestRoom(`shuffle/on`, this.#delay)
    } else {
      await this.#requestRoom(`shuffle/off`, this.#delay)
      await this.#requestRoom(`trackseek/1`, this.#delay)
    }

    await this.#requestRoom('play')
  }

  async process(cmd, { delay } = {}) {
    log.info('Command:', cmd)

    const [command, ...parts] = this.#parseText(cmd).split(this.#sep)
    const partsStr = parts.join(this.#sep)

    log.verbose('Parsed command:', command, partsStr)

    if (command === 'room') {
      return this.setRoom(partsStr)
    }

    if (command === 'shuffle' && partsStr === 'queue') {
      return this.shuffleQueue()
    }

    let requestCommand = [command, ...parts].join(this.#sep)

    const serviceCommand = this.#getService(command, partsStr)
    if (serviceCommand) {
      await this.#requestRoom('clearqueue', this.#delay)
      requestCommand = serviceCommand
    }

    return this.#requestRoom(requestCommand, delay)
  }
}
