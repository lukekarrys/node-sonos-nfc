module.exports = {
  apps: [
    {
      name: 'sonos-nfc',
      max_restarts: 1,
      combine_logs: true,
      script: './lib/index.js',
      interpreter: `${process.env.FNM_MULTISHELL_PATH}/bin/node`,
    },
  ],
}
