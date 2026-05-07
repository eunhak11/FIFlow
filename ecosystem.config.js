module.exports = {
  apps: [
    {
      name: 'fiflow-web',
      cwd: '/home/fiflow/web',
      script: 'node',
      args: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'fiflow-kis-ws',
      cwd: '/home/fiflow/crawler',
      script: '/home/fiflow/crawler/venv/bin/python3',
      args: 'kis_websocket.py',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
}
