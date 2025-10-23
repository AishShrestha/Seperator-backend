import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger('NotificationGateway');

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // you can check auth token in client.handshake.auth if provided
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client emits 'join' with { userId } to join its personal room
  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.userId) {
      return;
    }
    client.join(data.userId);
    this.logger.log(`Socket ${client.id} joined room ${data.userId}`);
  }

  // Helper to send notification to a user's room
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(userId).emit('notification', notification);
  }

  // broadcast to a group room if you prefer group rooms
  sendNotificationToGroup(groupId: string, event: string, payload: any) {
    this.server.to(`group:${groupId}`).emit(event, payload);
  }
}
