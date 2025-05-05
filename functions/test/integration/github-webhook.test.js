const { expect } = require('chai');
const fetch = require('node-fetch').default || require('node-fetch');
const crypto = require('crypto');

describe('GitHub Webhook Integration', () => {
  // GitHub push event sample payload
  const pushPayload = {
    ref: 'refs/heads/main',
    repository: {
      name: 'test-repo',
      full_name: 'user/test-repo',
      html_url: 'https://github.com/user/test-repo'
    },
    commits: [
      {
        id: '1234567890abcdef1234567890abcdef12345678',
        message: 'Test commit message',
        url: 'https://github.com/user/test-repo/commit/1234567',
        author: {
          name: 'Test User',
          email: 'test@example.com'
        }
      }
    ],
    sender: {
      login: 'testuser',
      html_url: 'https://github.com/testuser',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345'
    },
    compare: 'https://github.com/user/test-repo/compare/abc...def'
  };

  // GitHub pull request event sample payload
  const prPayload = {
    action: 'opened',
    repository: {
      name: 'test-repo',
      full_name: 'user/test-repo',
      html_url: 'https://github.com/user/test-repo'
    },
    pull_request: {
      number: 123,
      html_url: 'https://github.com/user/test-repo/pull/123',
      title: 'Test Pull Request',
      body: 'This is a test pull request',
      state: 'open',
      merged: false
    },
    sender: {
      login: 'testuser',
      html_url: 'https://github.com/testuser',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345'
    }
  };

  // Create signature for GitHub webhook
  const createSignature = (payload, secret) => {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');
    return `sha256=${digest}`;
  };

  it('should handle GitHub push events and forward to Discord', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    const githubSecret = 'test-github-secret';
    const signature = createSignature(pushPayload, githubSecret);

    // Send a push event to the webhook endpoint
    const response = await fetch(`${functionsUrl}/githubNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': signature
      },
      body: JSON.stringify(pushPayload)
    });

    // Webhook should return 200
    expect(response.status).to.equal(200);
    
    // Parse the response body to get the Discord response
    const responseBody = await response.json();
    
    // Verify that we got a Discord response back
    expect(responseBody).to.have.property('discord_response');
    expect(responseBody.discord_response).to.have.property('success', true);
    expect(responseBody.discord_response).to.have.property('echo');
    
    // Check that the echo contains the expected data
    const discordPayload = responseBody.discord_response.echo;
    expect(discordPayload).to.have.property('embeds');
    expect(discordPayload.embeds).to.be.an('array').that.has.lengthOf(1);
    
    // Verify the embed contains the expected data
    const embed = discordPayload.embeds[0];
    expect(embed.title).to.include('test-repo');
    expect(embed.title).to.include('Push');
    expect(embed.author.name).to.equal('testuser');
    expect(embed.footer.text).to.equal('GitHub');
  });

  it('should handle GitHub pull request events and forward to Discord', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    const githubSecret = 'test-github-secret';
    const signature = createSignature(prPayload, githubSecret);

    // Send a PR event to the webhook endpoint
    const response = await fetch(`${functionsUrl}/githubNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': signature
      },
      body: JSON.stringify(prPayload)
    });

    // Webhook should return 200
    expect(response.status).to.equal(200);
    
    // Parse the response body to get the Discord response
    const responseBody = await response.json();
    
    // Verify that we got a Discord response back
    expect(responseBody).to.have.property('discord_response');
    expect(responseBody.discord_response).to.have.property('success', true);
    expect(responseBody.discord_response).to.have.property('echo');
    
    // Check that the echo contains the expected data
    const discordPayload = responseBody.discord_response.echo;
    expect(discordPayload).to.have.property('embeds');
    expect(discordPayload.embeds).to.be.an('array').that.has.lengthOf(1);
    
    // Verify the embed contains the expected data
    const embed = discordPayload.embeds[0];
    expect(embed.title).to.include('test-repo');
    expect(embed.title).to.include('Pull Request');
    expect(embed.description).to.include('Test Pull Request');
    expect(embed.author.name).to.equal('testuser');
    expect(embed.footer.text).to.equal('GitHub');
  });

  it('should process requests with invalid signatures in test mode', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send with invalid signature
    const response = await fetch(`${functionsUrl}/githubNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': 'sha256=invalid_signature'
      },
      body: JSON.stringify(pushPayload)
    });

    // In test mode, webhook should accept the request despite invalid signature
    expect(response.status).to.equal(200);
    
    // Verify we get a response with Discord data
    const responseBody = await response.json();
    expect(responseBody).to.have.property('discord_response');
    expect(responseBody.discord_response).to.have.property('success', true);
  });

  it('should reject unsupported HTTP methods', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send GET request (only POST is supported)
    const response = await fetch(`${functionsUrl}/githubNotification`, {
      method: 'GET'
    });

    // Webhook should return 405 Method Not Allowed
    expect(response.status).to.equal(405);
  });

  it('should handle unsupported event types with 202 status', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    const githubSecret = 'test-github-secret';
    const signature = createSignature(pushPayload, githubSecret);

    // Send an unsupported event type
    const response = await fetch(`${functionsUrl}/githubNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'unsupported_event',
        'X-Hub-Signature-256': signature
      },
      body: JSON.stringify(pushPayload)
    });

    // Webhook should return 202 Accepted for unsupported events
    expect(response.status).to.equal(202);
  });
});