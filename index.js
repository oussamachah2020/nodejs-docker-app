const express = require('express');
const os = require('os');
const { Pool } = require('pg');
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "myapp",
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
})

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const logsDir = path.join(__dirname, 'logs');
if(!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir);
}

function log(message) {
	const timestamp = new Date().toISOString();
	const logMessage = `[${timestamp}] ${message}\n`;
	console.log(logMessage.trim());
	fs.appendFileSync(path.join(logsDir, 'app.log'), logMessage)
}

app.get('/', (req, res) => {
    res.send(`
      <h1>Hello from Docker!</h1>
      <p>Hostname: ${os.hostname()}</p>
      <p>Node Version: ${process.version}</p>
    `);
});

app.get('/test', (req, res) => {
  res.json({ 
      message: 'This is a test route!',
      timestamp: new Date()
  });
});

app.get('/db/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: result.rows[0].now
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

app.get('/db/init', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY ,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`)
      res.json({ message: 'Users table created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/users/create', express.json(), async (req, res) => {
  try {
      const { name, email } = req.body;
      const result = await pool.query(
          'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
          [name, email]
      );
      res.status(201).json(result.rows[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/users', async (req, res) => {
  try {
      log('Fetching all users');
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      log(`Found ${result.rows.length} users`)
      res.json(result.rows);
  } catch (error) {
      log(`Error fetching users: ${error.message}`)
      res.status(500).json({ error: error.message });
  }
});

app.get('/api/info', (req, res) => {
    res.json({
        hostname: os.hostname(),
        nodeVersion: process.version
    });
});

app.get('/env', (req, res) => {
  res.json({
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
      hostname: os.hostname()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
