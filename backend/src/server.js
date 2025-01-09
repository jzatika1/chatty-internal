/**
 * server.js
 *
 * A minimal Node.js backend that:
 *  1. Listens on port 5000 via HTTPS.
 *  2. Accepts JSON messages from the frontend (POST /api/chat).
 *  3. Returns either "Not implemented yet" or calls the Python service.
 *  4. Logs each incoming request using a simple middleware.
 */

const fs = require('fs');
const https = require('https');
const express = require('express');
const axios = require('axios');

// -------------------------------------------------
// SSL Certificate and Key
// -------------------------------------------------
const privateKey = fs.readFileSync('ssl/selfsigned.key', 'utf8');
const certificate = fs.readFileSync('ssl/selfsigned.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
app.use(express.json());

// -------------------------------------------------
// Minimal logging middleware for all routes
// -------------------------------------------------
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// -------------------------------------------------
// Health-check route
// -------------------------------------------------
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok' });
});

// -------------------------------------------------
// POST /api/chat
// Toggle this to control Python Integration
// -------------------------------------------------
const PYTHON_INTEGRATION_ENABLED = false;

app.post('/api/chat', async (req, res) => {
  try {
    const { content } = req.body; // The user's message from the React app
    console.log(`Received content: "${content}"`);

    if (!content) {
      return res.status(400).json({ error: 'No "content" field in request body.' });
    }

    // If Python Integration is enabled, call Python over HTTPS with self-signed cert
    if (PYTHON_INTEGRATION_ENABLED) {
      const pythonResponse = await axios.post(
        'https://localhost:8000/chat',
        { userMessage: content },
        {
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      );

      // pythonResponse.data typically has the form { assistant: "GPT text" }
      // so destructure it:
      const { assistant } = pythonResponse.data;

      // Return exactly { assistant: "GPT text" } to the frontend
      return res.json({ assistant });
    }

    // If integration disabled, return placeholder
    return res.json({ assistant: 'Not implemented yet...' });
  } catch (error) {
    console.error('Error in /api/chat route:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------------------------------------
// Create an HTTPS server and listen on port 5000
// -------------------------------------------------
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(5000, () => {
  console.log('HTTPS Node backend listening on port 5000');
});
