export default ({ level: logLevel = 'silly' } = {}) => {
  const levels = new Map([
    ['error', 0],
    ['warn', 1],
    ['notice', 2],
    ['info', 3],
    ['verbose', 4],
    ['silly', 5],
  ])

  const handler = (level, ...args) => {
    if (levels.get(level) <= levels.get(logLevel)) {
      console.log(level, ...args)
    }
  }

  process.on('log', handler)
  return () => process.off('log', handler)
}
