module.exports = {
  apps: [
    {
      name: 'expense-frontend',
      script: 'npx',
      args: 'serve -s build -l 3003',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
}; 