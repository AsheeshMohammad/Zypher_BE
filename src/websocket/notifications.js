import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

class NotificationWebSocket {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  handleConnection(ws, req) {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      this.clients.set(userId, ws);

      ws.on('close', () => {
        this.clients.delete(userId);
      });

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to notifications' }));

    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  }

  sendNotification(userId, notification) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    }
  }
}

export default NotificationWebSocket;