const levels = new Map([
  ['error', 0],
  ['warn', 1],
  ['notice', 2],
  ['info', 3],
  ['verbose', 4],
  ['silly', 5],
])

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

export default ({ level: logLevel = 'silly' } = {}) => {
  const handler = (level, ...args) => {
    if (levels.get(level) <= levels.get(logLevel)) {
      console.log(level.slice(0, 4).toUpperCase(), date(), ...args)
    }
  }

  process.on('log', handler)
  return () => process.off('log', handler)
}
