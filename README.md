# Discord Open Tools

A set of serverless integrations that send notifications from external tools (GitHub, Trello) to Discord channels using Firebase Functions.

## Features

- **GitHub integration**: Receive notifications for GitHub events (push, pull requests, issues, comments)
- **Trello integration**: Receive notifications for Trello activity (card creation, updates, comments, etc.)
- **Serverless**: Runs on Firebase Functions v2
- **No database required**: Configuration through environment variables

## Setup

### Prerequisites

- Node.js 20
- Firebase CLI (`npm install -g firebase-tools`)
- A Discord server with webhook URLs
- GitHub repository for webhook integration
- Trello board for Power-Up integration

### Installation

1. Clone this repository
2. Install dependencies:

```bash
cd functions
npm install
```

3. Log in to Firebase:

```bash
firebase login
```

4. Initialize your Firebase project:

```bash
# First set the project name (REQUIRED)
firebase use discord-open-tools

# Or add your own project
firebase use --add
```

> **Important**: You must set a Firebase project name before running any Firebase commands or tests. If you don't have a project yet, create one in the Firebase console first.

### Configuration

Set the required environment variables in your Firebase project:

```bash
# Set Discord webhook URL (required)
firebase functions:config:set discord.webhook_url="YOUR_DISCORD_WEBHOOK_URL"

# For GitHub integration (optional)
firebase functions:config:set github.secret="YOUR_GITHUB_WEBHOOK_SECRET"

# For Trello integration (optional)
firebase functions:config:set trello.api_key="YOUR_TRELLO_API_KEY"
```

The environment variables will be automatically loaded through the Firebase Functions params API in the code.

### Deployment

Deploy the functions to Firebase:

```bash
firebase deploy --only functions
```

After deployment, you'll get two function URLs:

- `githubNotification` - Use this URL for GitHub webhooks
- `trelloNotification` - Use this URL for Trello Power-Ups

## GitHub Webhook Setup

1. Go to your GitHub repository
2. Navigate to Settings > Webhooks > Add webhook
3. Enter your Firebase function URL as the Payload URL
4. Select content type: `application/json`
5. If you set a secret, enter it in the Secret field
6. Choose which events to trigger the webhook:
   - Push
   - Pull requests
   - Issues
   - Issue comments
7. Click "Add webhook"

## Trello Setup

Setting up Trello integration is simple:

1. Get your Trello API Key from [Trello Developer Portal](https://trello.com/app-key)

2. Configure it in Firebase:
   ```bash
   firebase functions:config:set trello.api_key="YOUR_API_KEY"
   ```

3. Deploy your functions:
   ```bash
   firebase deploy --only functions
   ```

4. Connect your Trello board by visiting:
   ```
   https://YOUR_FIREBASE_PROJECT.web.app/registerTrelloBoard?boardId=YOUR_BOARD_ID
   ```
   
   The board ID is the 8-character code in your Trello board URL: `https://trello.com/b/BOARD_ID/your-board-name`

That's it! The system will:
1. Ask you to authorize the application in Trello
2. Automatically register a webhook for your board
3. Show a success message when complete

## Customization

### Event Filtering

Modify the event types in:
- `src/github/webhook.js` for GitHub events
- `src/trello/integration.js` for Trello events

### Message Formatting

Customize Discord message appearance in:
- `src/utils/discord.js`

## Testing

The project includes comprehensive integration tests to verify the integrations work correctly.

### Running Tests

Run the integration tests with:

```bash
cd functions
npm test
```

> **Note**: Make sure you've set your Firebase project using `firebase use discord-open-tools` before running tests.

The tests will:
1. Start a mock Discord server
2. Configure Firebase with the mock Discord server URL 
3. Start the Firebase emulator
4. Send test webhook payloads to the functions
5. Verify that the Discord mock server receives correctly formatted messages

This ensures that the entire pipeline works as expected without needing to connect to actual external services.

### Test Structure

- `test/integration/github-webhook.test.js` - Tests for GitHub webhook integration
- `test/integration/trello-integration.test.js` - Tests for Trello integration
- `test/integration/discord-webhook-verification.test.js` - Verifies correct message formatting 
- `test/mock-discord-server.js` - A mock Discord server that captures webhook requests
- `test/run-integration-tests.js` - Script to run the integration tests with Firebase emulator

## License

MIT