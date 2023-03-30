const FNM = process.env.FNM_MULTISHELL_PATH

module.exports = {
  apps: [
    {
      name: 'sonos-nfc',
      cwd: __dirname,
      combine_logs: true,
      watch: true,
      ignore_watch: ['node_modules'],
      script: './lib/index.js',
      interpreter: FNM ? `${FNM}/bin/node` : 'node',
    },
  ],
}
