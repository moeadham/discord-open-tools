const { expect } = require('chai');
const fetch = require('node-fetch').default || require('node-fetch');

describe('Trello Integration Tests', () => {
  // Sample Trello card created event payload
  const trelloCardCreatedPayload = {
    action: {
      type: 'createCard',
      memberCreator: {
        fullName: 'Test User',
        username: 'testuser'
      },
      data: {
        card: {
          id: 'card123',
          name: 'Test Card',
          shortLink: 'abc123'
        },
        list: {
          id: 'list123',
          name: 'To Do'
        },
        board: {
          id: 'board123',
          name: 'Test Board',
          shortLink: 'def456'
        }
      }
    },
    model: {
      id: 'board123',
      name: 'Test Board',
      url: 'https://trello.com/b/def456/test-board'
    }
  };

  // Sample Trello card moved event payload
  const trelloCardMovedPayload = {
    action: {
      type: 'updateCard',
      memberCreator: {
        fullName: 'Test User',
        username: 'testuser'
      },
      data: {
        card: {
          id: 'card123',
          name: 'Test Card',
          shortLink: 'abc123'
        },
        listBefore: {
          id: 'list123',
          name: 'To Do'
        },
        listAfter: {
          id: 'list456',
          name: 'Done'
        },
        board: {
          id: 'board123',
          name: 'Test Board',
          shortLink: 'def456'
        }
      }
    },
    model: {
      id: 'board123',
      name: 'Test Board',
      url: 'https://trello.com/b/def456/test-board'
    }
  };

  // Sample Trello comment added event payload
  const trelloCommentPayload = {
    action: {
      type: 'commentCard',
      memberCreator: {
        fullName: 'Test User',
        username: 'testuser'
      },
      data: {
        card: {
          id: 'card123',
          name: 'Test Card',
          shortLink: 'abc123'
        },
        text: 'This is a test comment',
        board: {
          id: 'board123',
          name: 'Test Board',
          shortLink: 'def456'
        }
      }
    },
    model: {
      id: 'board123',
      name: 'Test Board',
      url: 'https://trello.com/b/def456/test-board'
    }
  };

  it('should handle Trello card created events and forward to Discord', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send a Trello card created event
    const response = await fetch(`${functionsUrl}/trelloNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trelloCardCreatedPayload)
    });

    // Response should be successful
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
    expect(embed.title).to.equal('Card Created');
    expect(embed.description).to.include('Test User');
    expect(embed.description).to.include('Test Card');
    expect(embed.footer.text).to.equal('Trello');
  });

  it('should handle Trello card moved events and forward to Discord', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send a Trello card moved event
    const response = await fetch(`${functionsUrl}/trelloNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trelloCardMovedPayload)
    });

    // Response should be successful
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
    expect(embed.title).to.equal('Card Moved');
    expect(embed.description).to.include('Test User');
    expect(embed.footer.text).to.equal('Trello');
  });

  it('should handle Trello comment added events and forward to Discord', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send a Trello comment event
    const response = await fetch(`${functionsUrl}/trelloNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trelloCommentPayload)
    });

    // Response should be successful
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
    expect(embed.title).to.equal('Comment Added');
    expect(embed.description).to.include('Test User');
    expect(embed.footer.text).to.equal('Trello');
  });

  it('should reject unsupported HTTP methods', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send GET request (only POST is supported)
    const response = await fetch(`${functionsUrl}/trelloNotification`, {
      method: 'GET'
    });

    // Should return 405 Method Not Allowed
    expect(response.status).to.equal(405);
  });

  it('should accept invalid payloads in test mode', async () => {
    const functionsUrl = process.env.FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('FUNCTIONS_URL environment variable not set');
    }

    // Send an invalid payload (missing required fields)
    const response = await fetch(`${functionsUrl}/trelloNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ invalid: 'payload' })
    });

    // In test mode, should accept the payload
    expect(response.status).to.equal(200);
    
    // Parse the response body to get the Discord response
    const responseBody = await response.json();
    
    // Verify that we got a Discord response back
    expect(responseBody).to.have.property('discord_response');
    expect(responseBody.discord_response).to.have.property('success', true);
    expect(responseBody.discord_response).to.have.property('echo');
    
    // Echo should contain an embed 
    const discordPayload = responseBody.discord_response.echo;
    expect(discordPayload).to.have.property('embeds');
    expect(discordPayload.embeds).to.be.an('array').that.has.lengthOf(1);
  });
});