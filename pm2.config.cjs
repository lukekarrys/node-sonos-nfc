const FNM = process.env.FNM_DIR

module.exports = {
  apps: [
    {
      name: 'sonos-nfc',
      cwd: __dirname,
      combine_logs: true,
      watch: true,
      cron_restart: '0 6,18 * * *',
      ignore_watch: ['node_modules', '.git'],
      script: './lib/index.js',
      interpreter: FNM ? `${FNM}/aliases/18/bin/node` : 'node',
    },
  ],
}
