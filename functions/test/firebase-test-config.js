const admin = require('firebase-admin');
const functions = require('firebase-functions');
const functionsTest = require('firebase-functions-test')();

// Mock environment variables
functionsTest.mockConfig({
  discord: {
    webhook_url: 'http://localhost:{{MOCK_DISCORD_PORT}}/api/webhooks/123456789/abcdefg'
  },
  github: {
    secret: 'test-github-secret'
  },
  trello: {
    api_key: 'test-trello-api-key',
    token: 'test-trello-token'
  }
});

// Mock the Firebase Admin SDK
functionsTest.mockFirebaseAdmin();

// Export the testing utilities
module.exports = {
  admin,
  functions,
  functionsTest
};