module.exports = {
  apps: [
    {
      name: 'sonos-nfc',
      cron_restart: '0 6,18 * * *',
      script: './lib/index.ts',
      interpreter: 'node',
      interpreter_args: '--experimental-strip-types',
    },
  ],
}
