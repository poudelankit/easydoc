import { ForbiddenException, UnauthorizedException, UsePipes, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { resolveCorsOrigin } from "../../common/config/security-env";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CommunicationService } from "./communication.service";
import { ReadEventDto, SocketMessageDto, TaskRoomEventDto, TypingEventDto } from "./dto/socket-events.dto";

interface AccessTokenPayload {
  sub: string;
  phoneNumber: string;
  role: AuthenticatedUser["role"];
  type: "access";
}

type AuthenticatedSocket = Socket & { data: Socket["data"] & { user?: AuthenticatedUser } };

@WebSocketGateway({
  cors: {
    origin: resolveCorsOrigin(),
    credentials: true
  }
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  })
)
export class CommunicationGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly communication: CommunicationService,
    private readonly jwt: JwtService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    client.data.user = await this.authenticate(client);
  }

  @SubscribeMessage("task:join")
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TaskRoomEventDto
  ) {
    const user = this.getSocketUser(client);
    const room = await this.communication.getRoomForTask(payload.taskId, user);
    await client.join(this.socketRoom(payload.taskId));
    return room;
  }

  @SubscribeMessage("task:message:send")
  async handleMessageSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SocketMessageDto
  ) {
    const user = this.getSocketUser(client);
    const message = await this.communication.sendMessage(payload.taskId, user, payload);
    this.server.to(this.socketRoom(payload.taskId)).emit("task:message:new", message);
    return message;
  }

  @SubscribeMessage("task:typing")
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingEventDto
  ) {
    const user = this.getSocketUser(client);
    await this.communication.getRoomForTask(payload.taskId, user);
    const event = {
      taskId: payload.taskId,
      userId: user.id,
      isTyping: payload.isTyping ?? true
    };
    client.to(this.socketRoom(payload.taskId)).emit("task:typing", event);
    return event;
  }

  @SubscribeMessage("task:read")
  async handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ReadEventDto
  ) {
    const user = this.getSocketUser(client);
    const readReceipt = await this.communication.markMessagesRead(
      payload.taskId,
      user,
      payload.messageIds
    );
    this.server.to(this.socketRoom(payload.taskId)).emit("task:read", readReceipt);
    return readReceipt;
  }

  private async authenticate(client: Socket): Promise<AuthenticatedUser> {
    const token = this.extractToken(client);
    if (!token) {
      throw new WsException(new UnauthorizedException("Missing bearer token"));
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new WsException(new UnauthorizedException("Invalid or expired access token"));
    }

    if (payload.type !== "access") {
      throw new WsException(new UnauthorizedException("Invalid access token"));
    }
    if (payload.role !== "CUSTOMER" && payload.role !== "AGENT") {
      throw new WsException(new ForbiddenException("Only customers and agents can use task chat"));
    }

    return {
      id: payload.sub,
      phoneNumber: payload.phoneNumber,
      role: payload.role
    };
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length);
    }
    return null;
  }

  private getSocketUser(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) {
      throw new WsException(new UnauthorizedException("Socket is not authenticated"));
    }
    return user;
  }

  private socketRoom(taskId: string) {
    return `task:${taskId}`;
  }
}
