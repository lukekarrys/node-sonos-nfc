import { log } from './logger.ts'

type Path = `/${string}`
type RequestOptions = {
  room?: boolean
  body?: Record<string, string>
  method?: 'POST'
}

export class Sonos {
  #url: string
  #initialRoom: string
  #dryRun?: boolean
  #room: string | null = null

  constructor({
    host: url,
    initialRoom,
    dryRun,
  }: {
    dryRun?: boolean
    host: string
    initialRoom: string
  }) {
    this.#url = url
    this.#initialRoom = initialRoom
    this.#dryRun = dryRun
  }

  async init() {
    await this.#setRoom(this.#initialRoom)
  }

  async process(cmdString: string) {
    log.info('Command:', cmdString)

    const cmd = cmdString.trim()

    if (!cmd) {
      return
    }

    const isUrl = URL.canParse(cmd)
    const isShorthand = cmd.includes(':')

    if (isUrl || isShorthand) {
      return this.#request('/replace-queue', {
        room: true,
        method: 'POST',
        body: {
          ...(isUrl ? { url: cmd } : {}),
          play: 'true',
          shuffleOnType: 'playlist',
        },
      })
    }

    if (cmd.startsWith('room/')) {
      return this.#setRoom(cmd.slice(5))
    }

    return this.#request(`/${cmd}`, { room: true, method: 'POST' })
  }

  async #request(path: Path, { room, body, method }: RequestOptions = {}) {
    if (room) {
      if (!this.#room) {
        throw new Error('Room must be set by calling `setRoom(name)`')
      }
      path = `/d/${this.#room}${path}`
    }

    const start = Date.now()

    const req = new Request(`${this.#url}${path}`, {
      method: method ?? (body ? 'POST' : 'GET'),
      ...(body ?
        {
          body: new URLSearchParams(body),
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'content-length': Buffer.byteLength(
              new URLSearchParams(body).toString(),
            ).toString(),
          },
        }
      : {}),
      signal: AbortSignal.timeout(2000),
    })

    if (req.method === 'POST' && this.#dryRun) {
      log.info('Dry run:', req)
      return
    }

    const res = await fetch(req)

    if (!res.ok) {
      throw new Error(`Request error`, {
        cause: {
          req,
          res,
          message:
            res.headers.get('content-type')?.includes('application/json') ?
              await res.json()
            : await res.text(),
        },
      })
    }

    log.info(
      req.method,
      req.url.replace(this.#url, ''),
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      req.body ? req.body.toString() : null,
      `status:${res.status}`,
      `time:${Date.now() - start}ms`,
    )

    return res
  }

  async #setRoom(roomName: string) {
    const names = await this.#request('/devices/name').then(
      (r) => r?.json() as unknown as string[],
    )
    if (!names.includes(roomName)) {
      throw new Error(
        `Could not set room name to ${roomName}. Must be one of: ${names.join(',')}`,
      )
    }
    this.#room = roomName
    log.info(`Current room updated to:`, this.#room)
  }
}
