const axios = require("axios");
const config = require("../utils/config");

/**
 * Register a Trello board for webhook notifications
 * This function handles both the initial request and the OAuth callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function registerBoard(req, res) {
  try {
    // Check for required parameters
    const boardId = req.query.boardId;
    if (!boardId) {
      return res.status(400).json({ 
        error: "Missing required parameter: boardId",
        usage: "Add ?boardId=YOUR_BOARD_ID to the URL"
      });
    }
    
    // Check if this is a callback from Trello with token
    const token = req.query.token;
    
    // Get Trello API credentials
    const apiKey = config.getTrelloApiKey();
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: "Trello API key not configured", 
        message: "The server administrator needs to set up a Trello API key first."
      });
    }

    // If we don't have a token, either redirect to Trello or handle the hash fragment
    if (!token) {
      // Check if this is a callback with a hash fragment token (which we won't see in req.query)
      // We need to return a page that extracts the token from the hash and redirects with it as a query param
      if (req.headers.referer && req.headers.referer.includes('trello.com/1/authorize')) {
        // This is likely a callback from Trello with a token in the hash fragment
        return res.send(`
          <html>
            <head>
              <title>Processing Trello Authorization</title>
              <script>
                // Extract token from hash fragment
                const hash = window.location.hash;
                const tokenMatch = hash.match(/#token=([^&]+)/);
                
                if (tokenMatch && tokenMatch[1]) {
                  // Redirect with token as a query parameter
                  const token = tokenMatch[1];
                  const boardId = "${boardId}";
                  window.location.href = "/registerTrelloBoard?boardId=" + boardId + "&token=" + token;
                } else {
                  document.body.innerHTML = '<h1>Error</h1><p>No token found in the URL. Please try again.</p>';
                }
              </script>
            </head>
            <body>
              <h1>Processing Trello Authorization...</h1>
              <p>Please wait while we process your authorization...</p>
            </body>
          </html>
        `);
      }
      
      // Generate the auth URL for the initial redirect to Trello
      const redirectUri = `${req.protocol}://${req.hostname}/registerTrelloBoard?boardId=${boardId}`;
      const scope = "read,write";
      const expiration = "never";
      const name = "Discord Notifications";
      
      // Extract the Trello domain from the API URL
      const trelloApiUrl = config.getTrelloApiUrl();
      const trelloDomain = trelloApiUrl.includes('localhost') 
        ? trelloApiUrl  // Use the full URL for tests
        : "https://trello.com";
      
      const authUrl = `${trelloDomain}/1/authorize?expiration=${expiration}&scope=${scope}&response_type=token&name=${encodeURIComponent(name)}&key=${apiKey}&return_url=${encodeURIComponent(redirectUri)}`;
      
      // Redirect the user to Trello's auth page
      return res.redirect(authUrl);
    }
    
    // At this point we have the token from Trello
    // Determine the callback URL for the webhook
    const baseUrl = `${req.protocol}://${req.hostname}`;
    const callbackUrl = `${baseUrl}/trelloNotification`;
    
    // Description
    const description = `Discord notification webhook (created: ${new Date().toISOString()})`;
    
    // Register the webhook with Trello
    try {
      // First let's verify the board ID by making a GET request to the board endpoint
      const trelloApiUrl = config.getTrelloApiUrl();
      
      console.log(`Verifying board ID ${boardId} with Trello API at ${trelloApiUrl}`);
      
      // Try to get the board first to validate if it exists and is accessible
      let fullBoardId;
      try {
        const boardResponse = await axios.get(
          `${trelloApiUrl}/boards/${boardId}`,
          {
            params: {
              key: apiKey,
              token: token,
              fields: 'name,id' // Get the ID field specifically
            }
          }
        );
        console.log(`Board verification successful: ${boardResponse.data.name}`);
        
        // Use the full ID from the board response instead of the shortlink
        fullBoardId = boardResponse.data.id;
        console.log(`Using full board ID for webhook: ${fullBoardId}`);
        
        if (!fullBoardId) {
          throw new Error("Couldn't retrieve the full board ID");
        }
      } catch (boardError) {
        console.error("Error verifying board:", boardError.response?.data || boardError.message);
        throw new Error(`Board verification failed: ${boardError.response?.data?.message || boardError.message}. Make sure the board ID is correct and you have access to it.`);
      }
      
      // Now register the webhook using the full board ID
      console.log(`Registering webhook for board ${fullBoardId} with callback URL ${callbackUrl}`);
      const webhookData = {
        callbackURL: callbackUrl,
        idModel: fullBoardId, // Use the full ID instead of the shortlink
        description: description
      };
      console.log("Webhook registration payload:", JSON.stringify(webhookData));
      
      const response = await axios.post(
        `${trelloApiUrl}/webhooks`,
        webhookData,
        {
          params: {
            key: apiKey,
            token: token
          }
        }
      );
      
      console.log("Webhook registration successful:", response.data);
      
      // Display success page to user
      res.send(`
        <html>
          <head>
            <title>Trello Board Registered</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .success { color: green; }
              pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1 class="success">Success!</h1>
            <p>Your Trello board has been successfully connected to Discord notifications.</p>
            <h2>Webhook Details:</h2>
            <pre>${JSON.stringify(response.data, null, 2)}</pre>
          </body>
        </html>
      `);
    } catch (trelloError) {
      console.error("Error registering Trello webhook:", trelloError.response?.data || trelloError.message);
      
      // Display error page to user with more details
      res.status(500).send(`
        <html>
          <head>
            <title>Trello Registration Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .error { color: red; }
              pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
              .help { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
          </head>
          <body>
            <h1 class="error">Error Registering Trello Board</h1>
            <p>There was a problem connecting your Trello board to Discord notifications.</p>
            <p>Error details: ${trelloError.message}</p>
            <pre>${JSON.stringify(trelloError.response?.data || {}, null, 2)}</pre>
            
            <div class="help">
              <h2>Troubleshooting</h2>
              <p>Here are some things to check:</p>
              <ul>
                <li>Make sure the board ID is correct. You provided: <code>${boardId}</code></li>
                <li>The board ID should be the ID from the URL, for example: <code>https://trello.com/b/<strong>abc123</strong>/board-name</code></li>
                <li>Ensure you have admin access to the board</li>
                <li>Try authorizing with Trello again by <a href="/registerTrelloBoard?boardId=${boardId}">clicking here</a></li>
              </ul>
            </div>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error("Error in registerBoard:", error);
    res.status(500).json({ 
      error: "Server error", 
      message: error.message 
    });
  }
}

module.exports = {
  registerBoard
};