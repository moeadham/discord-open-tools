const crypto = require("crypto");
const { formatGitHubMessage, sendDiscordMessage } = require("../utils/discord");
const config = require("../utils/config");

/**
 * Verify GitHub webhook signature
 * @param {Object} req - Request object
 * @param {string} secret - GitHub webhook secret
 * @returns {boolean} - Valid signature or not
 */
function verifyGitHubSignature(req, secret) {
  if (!secret) {
    console.warn("No GitHub webhook secret provided, skipping signature verification");
    return true;
  }

  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    console.error("No signature found in GitHub webhook request");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Handle GitHub webhook requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} discordWebhookUrl - Discord webhook URL
 * @param {string} secret - GitHub webhook secret
 * @returns {Promise<void>}
 */
async function handleWebhook(req, res, discordWebhookUrl, secret) {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  // Verify signature if secret is provided and not in test mode
  if (secret && !config.isTestMode() && !verifyGitHubSignature(req, secret)) {
    res.status(403).send("Invalid signature");
    return;
  }

  const eventType = req.headers["x-github-event"];
  if (!eventType) {
    res.status(400).send("No event type specified");
    return;
  }

  // Handle GitHub events we want to process
  const supportedEvents = ["push", "pull_request", "issues", "issue_comment"];
  
  if (supportedEvents.includes(eventType)) {
    const payload = req.body;
    
    try {
      // Format the message
      const embed = formatGitHubMessage(payload, eventType);
      
      // Send to Discord and get response
      const discordResponse = await sendDiscordMessage(discordWebhookUrl, embed);
      
      // In test mode, include response details for verification
      if (config.isTestMode()) {
        res.status(200).json({
          message: "Webhook processed successfully",
          discord_response: discordResponse
        });
      } else {
        res.status(200).send("Webhook processed successfully");
      }
    } catch (error) {
      console.error(`Error processing ${eventType} event:`, error);
      res.status(500).send("Error processing webhook");
    }
  } else {
    // Acknowledge receipt but don't process unsupported events
    console.log(`Received unsupported GitHub event: ${eventType}`);
    res.status(202).send("Event type not processed");
  }
}

module.exports = {
  handleWebhook
};