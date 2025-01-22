module.exports = {
  apps: [
    {
      name: 'sonos-nfc',
      cwd: __dirname,
      combine_logs: true,
      cron_restart: '0 6,18 * * *',
      script: './lib/index.ts',
    },
  ],
}
