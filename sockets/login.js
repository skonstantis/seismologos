const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

// Map to store active users
const activeUsers = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const username = req.url.split('/').pop();
  activeUsers.set(username, { ws, lastActive: new Date() });

  // Handle WebSocket closure
  ws.on('close', async () => {
    const lastActiveTime = new Date().getTime();
    activeUsers.delete(username);
    // Update the user's active status in the database
    await db.collection('users').updateOne(
      { username: username },
      { $set: { active: lastActiveTime } }
    );
  });

  // Handle incoming messages to update last active time
  ws.on('message', async (message) => {
    if (activeUsers.has(username)) {
      activeUsers.get(username).lastActive = new Date();
      // Update the user's active status in the database
      await db.collection('users').updateOne(
        { username: username },
        { $set: { active: 0 } }
      );
    }
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

// Function to get user status
const getUserStatus = async (username) => {
  const user = await db.collection('users').findOne({ username: username });
  if (!user) {
    return 'User not found';
  }

  if (user.active === 0) {
    return 'active now';
  }

  const now = new Date();
  const lastActive = new Date(user.active);
  const diffMinutes = Math.floor((now - lastActive) / 60000);

  return `active ${diffMinutes} minutes ago`;
};
