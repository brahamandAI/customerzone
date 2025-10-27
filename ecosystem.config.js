module.exports = {
  apps: [
    {
      name: 'expense-backend',
      script: 'server.js',
      cwd: './backend',
      env: { PORT: 8001 },
      autorestart: false,
      stop_exit_codes: [0]
    },
    {
      name: 'expense-frontend',
      script: 'npx',
      args: 'serve -s build -l 3004 -n',
      cwd: './frontend',
      autorestart: false,
      stop_exit_codes: [0]
    }
  ]
};
