const { expect } = require('chai');
const fetch = require('node-fetch').default || require('node-fetch');
const crypto = require('crypto');

describe('Trello Registration Tests', () => {
  // Generate a random board ID for testing
  const testBoardId = `board_${crypto.randomBytes(8).toString('hex')}`;

  it('should complete the full Trello authentication and webhook registration flow', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Step 1: Make initial request to registerTrelloBoard with just a boardId
    const initialResponse = await fetch(
      `${functionsUrl}/registerTrelloBoard?boardId=${testBoardId}`, 
      {
        redirect: 'manual' // Don't automatically follow redirects
      }
    );

    // Should get a 302 redirect to Trello authorization
    expect(initialResponse.status).to.equal(302);
    
    // Get the redirect URL (to Trello auth)
    const trelloAuthUrl = initialResponse.headers.get('location');
    expect(trelloAuthUrl).to.include('/1/authorize');
    
    // Step 2: Make request to the Trello auth URL
    // Our mock server will redirect back to our callback with a token
    const trelloResponse = await fetch(trelloAuthUrl, {
      redirect: 'manual' // Don't auto-follow this redirect either
    });
    
    // Should get another 302 redirect back to our callback
    expect(trelloResponse.status).to.equal(302);
    
    // Get the callback URL (with token)
    const callbackUrl = trelloResponse.headers.get('location');
    expect(callbackUrl).to.include('boardId');
    expect(callbackUrl).to.include('token=');
    
    // The URL we get back will be incorrect in our test environment
    // We need to replace the domain with our functions URL
    const fixedCallbackUrl = callbackUrl.replace(/^http:\/\/[^\/]+\//, `${functionsUrl}/`);
    
    // Step 3: Make request to the callback URL to complete registration
    const finalResponse = await fetch(fixedCallbackUrl, {
      headers: {
        Accept: 'text/html'
      }
    });
    
    // Should get a 200 success with HTML response
    expect(finalResponse.status).to.equal(200);
    
    // Get the HTML response and check for success message
    const html = await finalResponse.text();
    expect(html).to.include('Success!');
    expect(html).to.include('Your Trello board has been successfully connected');
    expect(html).to.include('Webhook Details');
    
    // The response should include the webhook JSON
    expect(html).to.include('callbackURL');
    expect(html).to.include('idModel');
    expect(html).to.include(testBoardId);
  });

  it('should return an error for missing boardId', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Make request without boardId
    const response = await fetch(`${functionsUrl}/registerTrelloBoard`);
    
    // Should get a 400 Bad Request
    expect(response.status).to.equal(400);
    
    // Response should be JSON with error info
    const responseBody = await response.json();
    expect(responseBody).to.have.property('error');
    expect(responseBody.error).to.include('Missing required parameter');
  });
});