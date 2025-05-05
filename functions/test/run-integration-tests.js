const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch').default || require('node-fetch');
const MockDiscordServer = require('./mock-discord-server');

// Create a temporary firebase config file for testing
function createFirebaseTestConfig(mockDiscordUrl, mockTrelloApiUrl) {
  const configPath = path.join(__dirname, '..', '.runtimeconfig.json');
  const config = {
    discord: {
      webhook_url: mockDiscordUrl // Use the URL from our mock Discord server
    },
    github: {
      secret: "test-github-secret"
    },
    trello: {
      api_key: "test-trello-api-key",
      token: "test-trello-token",
      api_url: mockTrelloApiUrl || "http://localhost:5000/trello-mock-api"
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

// Remove the temporary config file
function removeFirebaseTestConfig() {
  const configPath = path.join(__dirname, '..', '.runtimeconfig.json');
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

// Wait for Firebase Emulator to be ready
async function waitForEmulator(port, retries = 10, delay = 1000) {
  console.log(`Checking if Firebase emulator is ready on port ${port}...`);
  
  for (let i = 0; i < retries; i++) {
    try {
      // Try to fetch the emulator's functions URL directly
      const response = await fetch(`http://127.0.0.1:${port}/discord-open-tools/us-central1/githubNotification`, {
        method: 'HEAD',
        timeout: 1000
      });
      
      console.log(`Attempt ${i+1}: Emulator response status ${response.status}`);
      
      // Any response means the emulator is up
      return true;
    } catch (error) {
      console.log(`Attempt ${i+1}: Emulator not ready yet: ${error.message}`);
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Consider the emulator ready even if we couldn't reach it directly
  // This is a fallback in case the fetch doesn't work but emulator is actually running
  console.log('Could not verify emulator is ready, but proceeding anyway since we detected it running');
  return true;
}

// Run the integration tests against the emulator
async function runIntegrationTests(functionUrl, discordWebhookUrl, mockDiscordServer) {
  const Mocha = require('mocha');
  const mocha = new Mocha({
    timeout: 10000
  });

  // Set environment variables for tests
  process.env.FUNCTIONS_URL = functionUrl;
  process.env.NODE_ENV = 'test';
  process.env.DISCORD_WEBHOOK_URL_TEST = discordWebhookUrl;
  process.env.GITHUB_SECRET_TEST = 'test-github-secret';
  process.env.TRELLO_API_KEY_TEST = 'test-trello-api-key';
  process.env.TRELLO_API_URL_TEST = mockDiscordServer.getTrelloApiUrl();

  // Add all test files
  const testDir = path.join(__dirname, 'integration');
  fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .forEach(file => {
      mocha.addFile(path.join(testDir, file));
    });

  // Run the tests
  return new Promise((resolve, reject) => {
    mocha.run(failures => {
      if (failures) {
        reject(new Error(`${failures} tests failed`));
      } else {
        resolve();
      }
    });
  });
}

// Main function
async function main() {
  // We're using the global variables declared above for cleanup
  let mockDiscordServer = null;

  try {
    // Start a mock Discord server
    mockDiscordServer = new MockDiscordServer();
    const mockDiscordPort = await mockDiscordServer.start();
    const mockDiscordUrl = mockDiscordServer.getWebhookUrl();
    console.log(`Mock Discord server started at ${mockDiscordUrl}`);
    
    // Get Trello mock API URL too
    const mockTrelloApiUrl = mockDiscordServer.getTrelloApiUrl();
    console.log(`Mock Trello API available at: ${mockTrelloApiUrl}`);
    
    // Create temporary firebase config (still needed for GitHub secret etc.)
    configPath = createFirebaseTestConfig(mockDiscordUrl, mockTrelloApiUrl);
    console.log(`Created temporary Firebase config at ${configPath}`);
    
    // Set up emulator environment with test environment variables
    console.log(`Setting test environment variables`);
    
    const env = { 
      ...process.env, 
      NODE_ENV: 'test',
      DISCORD_WEBHOOK_URL_TEST: mockDiscordUrl,
      GITHUB_SECRET_TEST: 'test-github-secret',
      TRELLO_API_KEY_TEST: 'test-trello-api-key',
      TRELLO_API_URL_TEST: mockTrelloApiUrl
    };
    
    emulatorProcess = spawn('firebase', ['emulators:start'], {
      shell: true,
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      env,
      detached: true // Create process group so we can kill all child processes
    });

    // Handle emulator output
    let functionsUrl = '';
    let emulatorReady = false;
    
    emulatorProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      // Look for the emulator table with the Functions port
      if (output.includes('Functions │ 127.0.0.1:5001')) {
        functionsUrl = 'http://127.0.0.1:5001/discord-open-tools/us-central1';
        console.log(`Detected functions URL from table: ${functionsUrl}`);
      }
      
      // Also look for initialization messages for any of our functions
      const initMatch = output.match(/functions\[us-central1-(githubNotification|trelloNotification)\]: http function initialized \((http:\/\/[^\/]+\/[^\/]+\/[^\/]+)\)/);
      if (initMatch && initMatch[2]) {
        functionsUrl = initMatch[2];
        console.log(`Detected functions base URL from initialization: ${functionsUrl}`);
      }
      
      // Check for "All emulators ready" message or function initialization
      if (output.includes('All emulators ready!') || 
          output.includes('functions[us-central1-githubNotification]: http function initialized') ||
          output.includes('functions[us-central1-trelloNotification]: http function initialized')) {
        emulatorReady = true;
        console.log('Firebase emulators are ready');
        
        // If we still don't have a URL, use the default
        if (!functionsUrl) {
          functionsUrl = 'http://127.0.0.1:5001/discord-open-tools/us-central1';
          console.log(`Using default functions URL: ${functionsUrl}`);
        }
      }
    });

    emulatorProcess.stderr.on('data', (data) => {
      console.error(`Emulator error: ${data.toString()}`);
    });

    // Wait for emulator to start (max 30 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    const waitTime = 1000; // 1 second between attempts
    
    while ((!functionsUrl || !emulatorReady) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempts++;
      
      if (attempts % 5 === 0) {
        console.log(`Still waiting for emulator... (${attempts}/${maxAttempts})`);
      }
      
      // If we've waited long enough (15s) and still don't have a URL, use the default
      if (attempts >= 15 && !functionsUrl) {
        functionsUrl = 'http://127.0.0.1:5001/discord-open-tools/us-central1';
        console.log(`Using default functions URL after waiting ${attempts} seconds`);
        break;
      }
    }
    
    if (!functionsUrl) {
      throw new Error('Failed to detect functions URL from emulator output after 30 seconds');
    }
    
    console.log('Firebase emulator is initialized with URL:', functionsUrl);
    
    // Extract the port from functionsUrl
    const urlObj = new URL(functionsUrl);
    const emulatorPort = urlObj.port;
    
    try {
      await waitForEmulator(emulatorPort);
      console.log('Firebase Emulator is ready');
    } catch (error) {
      // If waitForEmulator fails but we've already seen the "All emulators ready" message,
      // we can proceed anyway
      if (emulatorReady) {
        console.log('Skipping emulator readiness check because we already detected it is ready');
      } else {
        throw error;
      }
    }

    // Run the tests
    await runIntegrationTests(functionsUrl, mockDiscordUrl, mockDiscordServer);
    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up using our cleanup function
    if (mockDiscordServer) {
      await mockDiscordServer.stop();
    }
    cleanup();
  }

  process.exit(0);
}

// Define a cleanup function
let emulatorProcess = null;
let configPath = null;

const cleanup = () => {
  console.log('Running cleanup...');

  if (emulatorProcess) {
    try {
      // Kill the process group
      if (process.platform === 'win32') {
        emulatorProcess.kill();
      } else {
        process.kill(-emulatorProcess.pid, 'SIGKILL');
      }
      console.log('Firebase Emulator stopped');
    } catch (err) {
      console.error('Error stopping Firebase emulator:', err);
      try {
        emulatorProcess.kill('SIGKILL');
      } catch (innerErr) { /* ignore */ }
    }
  }

  if (configPath) {
    try {
      removeFirebaseTestConfig();
      console.log('Removed temporary Firebase config');
    } catch (err) {
      console.error('Error removing temporary Firebase config:', err);
    }
  }
};

// Handle unexpected shutdowns
process.on('SIGINT', () => {
  console.log('Received SIGINT signal');
  cleanup();
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  cleanup();
  process.exit(143);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  cleanup();
  process.exit(1);
});

// Run the script
main().catch(error => {
  console.error('Error running tests:', error);
  cleanup();
  process.exit(1);
});