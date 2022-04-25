import { Server, Socket } from 'socket.io';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  WsResponse,
} from '@nestjs/websockets';
import User from 'src/api/users/entities/user.entity';
import { Logger } from '@nestjs/common';

class Connections {
  userID: number;
  socketID: string[];
}

@WebSocketGateway({
  namespace: 'status',
  cors: {
    origin: `http://localhost:3001`,
    credentials: true,
  },
})
export class StatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('StatusSystem');
  private connectedClients: Connections[] = new Array();

  // Init, connection, disconnect event handlers
  afterInit(server: any) {
    this.connectedClients = new Array();
    this.logger.log('StatusSystem gateway is initialized');
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Connection: ${client.id}`);
    this.server.to(client.id).emit('requestUserInfo', '');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Disconnect: ${client.id}`);
    const userIndex = this.connectedClients.findIndex(
      (connection) => connection.socketID.indexOf(client.id) !== -1,
    );

    // Should never append, but prevention is better than cure
    if (userIndex === -1) {
      console.log('Client: ', client);
      console.log('Connected Clients: ', this.connectedClients);
      throw new WsException('Disconnecting user was not found');
    }

    // Removing socketID from corresponding user
    this.connectedClients[userIndex].socketID.splice(
      this.connectedClients[userIndex].socketID.indexOf(client.id),
      1,
    );

    // If the user has no more connected sockets, user is offline: removing it and sending updated list
    if (!this.connectedClients[userIndex].socketID.length) {
      this.connectedClients.splice(userIndex, 1);
      // console.log('Clients connected: ', this.connectedClients);
      this.server.emit(
        'update',
        this.connectedClients.map(({ userID, ...rest }) => userID),
      );
    }
    // console.log('Clients connected: ', this.connectedClients);
  }

  @SubscribeMessage('connection')
  handleNewConnection(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: User,
  ): WsResponse<number[]> {
    // Checking if the user already exists
    const userIndex = this.connectedClients.findIndex(
      (connection) => connection.userID === data.id,
    );

    // If user was not already connected, add the new user, and send the updated list
    if (userIndex === -1) {
      this.connectedClients.push({ userID: data.id, socketID: [client.id] });
      this.server.emit(
        'update',
        this.connectedClients.map(({ userID, ...rest }) => userID),
      );
      // console.log('Clients connected: ', this.connectedClients);
    }
    // Else, add the new socket to the corresponding Connections object and send client list to new client
    else {
      this.connectedClients[userIndex].socketID.push(client.id);
      return {
        event: 'update',
        data: this.connectedClients.map(({ userID, ...rest }) => userID),
      };
    }
    // console.log('Clients connected: ', this.connectedClients);
  }
}

// Differences between this.server.emit() / return { event: , data: }
// 1- this.server.emit() seems to be plateform specific, but send to everyone in the room
// 2- return { event: , data: } seems to only respond to the user that made the request