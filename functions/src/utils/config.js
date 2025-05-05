const { defineString } = require("firebase-functions/params");

// Define Firebase config parameters
const FIREBASE_PARAMS = {
  DISCORD_WEBHOOK_URL: defineString("DISCORD_WEBHOOK_URL"),
  GITHUB_SECRET: defineString("GITHUB_SECRET", { default: "" }),
  TRELLO_API_KEY: defineString("TRELLO_API_KEY", { default: "" }),
  TRELLO_SECRET: defineString("TRELLO_SECRET", { default: "" }),
  TRELLO_API_URL: defineString("TRELLO_API_URL", { default: "https://api.trello.com/1" })
};

/**
 * Determines if we're running in test mode
 * @returns {boolean} True if in test mode
 */
function isTestMode() {
  return process.env.NODE_ENV === 'test';
}

/**
 * Gets the Discord webhook URL
 * @returns {string} The webhook URL (or Firebase param object in production)
 */
function getDiscordWebhookUrl() {
  return isTestMode() 
    ? process.env.DISCORD_WEBHOOK_URL_TEST || ''
    : FIREBASE_PARAMS.DISCORD_WEBHOOK_URL.value();
}

/**
 * Gets the GitHub secret
 * @returns {string} The GitHub secret (or Firebase param object in production)
 */
function getGithubSecret() {
  return isTestMode()
    ? process.env.GITHUB_SECRET_TEST || ''
    : FIREBASE_PARAMS.GITHUB_SECRET.value();
}

/**
 * Gets the Trello API key
 * @returns {string} The Trello API key (or Firebase param object in production)
 */
function getTrelloApiKey() {
  return isTestMode()
    ? process.env.TRELLO_API_KEY_TEST || ''
    : FIREBASE_PARAMS.TRELLO_API_KEY.value();
}

// Token is now handled during registration directly

/**
 * Gets the Trello secret
 * @returns {string} The Trello secret (or Firebase param object in production)
 */
function getTrelloSecret() {
  return isTestMode()
    ? process.env.TRELLO_SECRET_TEST || ''
    : FIREBASE_PARAMS.TRELLO_SECRET.value();
}

/**
 * Gets the Trello API URL
 * @returns {string} The Trello API URL
 */
function getTrelloApiUrl() {
  return isTestMode()
    ? process.env.TRELLO_API_URL_TEST || 'http://localhost:5000/trello-mock-api'
    : FIREBASE_PARAMS.TRELLO_API_URL.value();
}

/**
 * Generic config value getter
 * @param {string} name - Config name matching both env var and Firebase param
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Config value
 */
function getConfig(name, defaultValue = '') {
  return isTestMode()
    ? process.env[`${name}_TEST`] || defaultValue
    : FIREBASE_PARAMS[name].value();
}

module.exports = {
  isTestMode,
  getDiscordWebhookUrl,
  getGithubSecret,
  getTrelloApiKey,
  getTrelloSecret,
  getTrelloApiUrl,
  getConfig
};