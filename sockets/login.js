const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

// Map to store active users
const activeUsers = new Map();
const MESSAGE_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const username = req.url.split('/').pop();
  activeUsers.set(username, { ws, lastActive: new Date() });

  let messageTimeout;

  // Function to reset the timeout
  const resetMessageTimeout = () => {
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    messageTimeout = setTimeout(() => {
      console.log(`Closing connection for ${username} due to inactivity.`);
      ws.close();
    }, MESSAGE_TIMEOUT);
  };

  // Reset timeout on connection establishment
  resetMessageTimeout();

  // Handle incoming messages to update last active time
  ws.on('message', async (message) => {
    if (activeUsers.has(username)) {
      activeUsers.get(username).lastActive = new Date();
      
      // Update the user's active status in the database
      await db.collection('users').updateOne(
        { username: username },
        { $set: { active: 0 } }
      );

      // Reset the message timeout since a message was received
      resetMessageTimeout();
    }
  });

  // Handle WebSocket closure
  ws.on('close', async () => {
    clearTimeout(messageTimeout); // Clear the timeout when closing
    const lastActiveTime = new Date().getTime();
    activeUsers.delete(username);
    
    // Update the user's active status in the database
    await db.collection('users').updateOne(
      { username: username },
      { $set: { active: lastActiveTime } }
    );
  });

  // Cleanup on error
  ws.on('error', async (error) => {
    console.error(`WebSocket error for ${username}:`, error);
    activeUsers.delete(username);
  });
});

// Upgrade HTTP server to handle WebSocket connections
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (pathname.startsWith('/ws/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});
