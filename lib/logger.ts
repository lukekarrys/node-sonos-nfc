import EventEmitter from 'events'
import { inspect } from 'util'

export type Level = 'error' | 'info' | 'debug'

const levels = new Map<Level, number>([
  ['error', 0],
  ['info', 3],
  ['debug', 5],
])

const emitter = new EventEmitter()

const logFn =
  (level: Level) =>
  (...args: any[]) =>
    void emitter.emit('log', level, ...args)

export const log = {
  error: logFn('error'),
  info: logFn('info'),
  debug: logFn('debug'),
}

const date = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${seconds}.${ms}`
}

export default ({ level: logLevel = 'debug' as Level } = {}) => {
  const handler = (level: Level, ...args: any[]) => {
    if (levels.get(level)! <= levels.get(logLevel)!) {
      console.log(
        level.toUpperCase(),
        date(),
        ...args.map((a) => inspect(a, { depth: Infinity, colors: true }))
      )
    }
  }
  emitter.on('log', handler)
  return () => emitter.off('log', handler)
}
