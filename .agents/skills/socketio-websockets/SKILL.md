---
name: socketio-websockets
description: Patrones y mejores prácticas para implementar WebSockets, Gateways, salas de chat y eventos en tiempo real en NestJS usando Socket.io.
---

# WebSockets y Socket.io en NestJS

Esta guía detalla cómo estructurar Gateways, manejar conexiones autenticadas, salas (rooms) y emisión de eventos bidireccionales en tiempo real.

## 1. Creación de un Gateway

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    // Opcional: extraer cookies o handshake auth token
    const token = client.handshake.auth?.token || client.handshake.headers.cookie;
    if (!token) {
      // client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.join(data.roomId);
    client.to(data.roomId).emit('user-joined', { socketId: client.id });
    return { event: 'joined', roomId: data.roomId };
  }

  @SubscribeMessage('send-message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; message: string; sender: string },
  ) {
    this.server.to(payload.roomId).emit('new-message', {
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }
}
```

## 2. Inyección y Emisión desde Servicios

Para emitir eventos en tiempo real desde servicios HTTP estándar (por ejemplo, notificar una actualización o notificación de sistema):

```typescript
import { Injectable } from '@nestjs/common';
import { ChatGateway } from '../gateways/chat.gateway';

@Injectable()
export class NotificationService {
  constructor(private readonly chatGateway: ChatGateway) {}

  notifyUser(roomId: string, message: string) {
    this.chatGateway.server.to(roomId).emit('notification', { message });
  }
}
```
