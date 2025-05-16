const { formatTrelloMessage, sendDiscordMessage } = require("../utils/discord");
const config = require("../utils/config");

/**
 * Handle Trello webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} discordWebhookUrl - Discord webhook URL
 * @returns {Promise<void>}
 */
async function handleTrelloEvent(req, res, discordWebhookUrl) {
  // We no longer need to check for non-POST requests here
  // as they are handled in the main function
  // This function will only be called for POST requests

  // Validate the payload unless we're in test mode
  if (!config.isTestMode() && (!req.body || !req.body.action)) {
    res.status(400).send("Invalid Trello payload");
    return;
  }
  
  try {
    // Format the message
    const embed = formatTrelloMessage(req.body);
    
    // If embed is null, this is a filtered event type, so just acknowledge without sending to Discord
    if (embed === null) {
      res.status(200).send("Trello event filtered (notification not sent)");
      return;
    }
    
    // Send to Discord
    const discordResponse = await sendDiscordMessage(discordWebhookUrl, embed);
    
    // In test mode, include response details for verification
    if (config.isTestMode()) {
      res.status(200).json({
        message: "Trello event processed successfully",
        discord_response: discordResponse
      });
    } else {
      res.status(200).send("Trello event processed successfully");
    }
  } catch (error) {
    console.error("Error processing Trello event:", error);
    res.status(500).send("Error processing Trello event");
  }
}

/**
 * Handle Trello webhook verification request (HEAD request)
 * This is for use with Trello official webhooks rather than Power-Ups
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function handleTrelloWebhookVerification(req, res) {
  if (req.method === "HEAD") {
    res.status(200).send("Webhook verification successful");
  } else {
    res.status(405).send("Method not allowed");
  }
}

// The registerTrelloWebhook function has been moved to registration.js

module.exports = {
  handleTrelloEvent,
  handleTrelloWebhookVerification
};