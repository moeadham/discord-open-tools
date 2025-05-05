const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const crypto = require('crypto');

/**
 * Mock server that simulates both Discord and Trello for testing.
 * 
 * For Discord:
 * - Echoes back webhook requests for validation
 * 
 * For Trello:
 * - Simulates OAuth authorization and token generation
 * - Records webhook registrations
 * - Can trigger webhook events
 */
class MockDiscordServer {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.server = null;
    this.port = null;
    
    // Discord webhook endpoint that echoes back requests
    this.app.post('/api/webhooks/:id/:token', (req, res) => {
      const requestData = req.body;
      console.log('Mock Discord received webhook:', JSON.stringify(requestData));
      
      // Return the same data back to the caller for validation
      res.status(200).json({
        success: true,
        echo: requestData
      });
    });
    
    // Trello OAuth endpoint - redirects back with a mock token
    this.app.get('/trello-mock-api/1/authorize', (req, res) => {
      const returnUrl = req.query.return_url;
      const mockToken = `mock_token_${crypto.randomBytes(8).toString('hex')}`;
      console.log('Mock Trello auth redirect with token:', mockToken);
      res.redirect(`${returnUrl}&token=${mockToken}`);
    });
    
    // Trello webhook registration endpoint - always returns success
    this.app.post('/trello-mock-api/webhooks', (req, res) => {
      const webhook = req.body;
      console.log('Mock Trello received webhook registration:', JSON.stringify(webhook));
      
      // Just return success with a fake ID
      res.status(200).json({
        id: `webhook_${crypto.randomBytes(8).toString('hex')}`,
        ...webhook,
        active: true,
        dateCreated: new Date().toISOString()
      });
    });
  }
  
  /**
   * Start the mock Discord server
   * @returns {Promise<number>} - The port the server is running on
   */
  start() {
    return new Promise((resolve) => {
      // Start on a random available port
      this.server = http.createServer(this.app);
      this.server.listen(0, () => {
        this.port = this.server.address().port;
        console.log(`Mock Discord server running on port ${this.port}`);
        resolve(this.port);
      });
    });
  }
  
  /**
   * Stop the mock Discord server
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.port = null;
          console.log('Mock Discord server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Get the URL for the Discord webhook
   * @param {string} id - Webhook ID (optional)
   * @param {string} token - Webhook token (optional)
   * @returns {string} - Webhook URL
   */
  getWebhookUrl(id = '123456789', token = 'mocktokenfortesting') {
    if (!this.port) {
      throw new Error('Mock Discord server not started');
    }
    return `http://localhost:${this.port}/api/webhooks/${id}/${token}`;
  }
  
  /**
   * Get the URL for the mock Trello API
   * @returns {string} - The base URL for the mock Trello API
   */
  getTrelloApiUrl() {
    if (!this.port) {
      throw new Error('Mock server not started');
    }
    return `http://localhost:${this.port}/trello-mock-api`;
  }
}

module.exports = MockDiscordServer;