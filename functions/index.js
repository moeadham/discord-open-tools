const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin
admin.initializeApp();

// Import centralized configuration
const config = require("./src/utils/config");

// Import integration functions
const githubWebhook = require("./src/github/webhook");
const trelloIntegration = require("./src/trello/integration");
const trelloRegistration = require("./src/trello/registration");

// GitHub webhook endpoint
exports.githubNotification = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      // Get config values using the helper functions
      const webhookUrl = config.getDiscordWebhookUrl();
      const githubSecret = config.getGithubSecret();
      
      await githubWebhook.handleWebhook(req, res, webhookUrl, githubSecret);
    } catch (error) {
      console.error("Error processing GitHub webhook:", error);
      res.status(500).send("Error processing webhook");
    }
  }
);

// Trello integration endpoint
exports.trelloNotification = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      // Log detailed information about every request
      console.log('=== TRELLO NOTIFICATION REQUEST RECEIVED ===');
      console.log('Method:', req.method);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('URL:', req.url);
      console.log('Path:', req.path);
      console.log('Query:', JSON.stringify(req.query, null, 2));
      console.log('Body:', req.body ? JSON.stringify(req.body).substring(0, 200) + '...' : 'No body');
      console.log('Raw body:', req.rawBody ? req.rawBody.toString().substring(0, 200) + '...' : 'No raw body');
      console.log('IP:', req.ip);
      console.log('==========================================');
      
      // Handle HEAD requests for webhook validation
      if (req.method === 'HEAD') {
        console.log('Responding to HEAD request with 200 OK');
        res.status(200).end();
        return;
      }
      
      // Also handle GET requests from Trello for webhook validation
      if (req.method === 'GET') {
        console.log('Responding to GET request with 200 OK (likely Trello webhook validation)');
        res.status(200).send('Webhook validation successful');
        return;
      }
      
      // Get config values using the helper functions
      const webhookUrl = config.getDiscordWebhookUrl();
      
      // Let the request pass through - test mode will handle any invalid payloads
      console.log('Processing POST request as a Trello event');
      await trelloIntegration.handleTrelloEvent(
        req, 
        res, 
        webhookUrl
      );
    } catch (error) {
      console.error("Error processing Trello event:", error);
      res.status(500).send("Error processing Trello event");
    }
  }
);

// Trello board registration endpoint (handles both initial request and OAuth callback)
exports.registerTrelloBoard = onRequest(
  { cors: true },
  async (req, res) => {
    await trelloRegistration.registerBoard(req, res);
  }
);