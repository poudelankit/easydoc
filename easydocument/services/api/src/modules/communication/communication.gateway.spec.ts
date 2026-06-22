import { JwtService } from "@nestjs/jwt";
import { CallsService } from "./calls.service";
import { CommunicationGateway } from "./communication.gateway";
import { CommunicationService } from "./communication.service";

const socketUser = {
  id: "11111111-1111-1111-1111-111111111111",
  phoneNumber: "+9779800000000",
  role: "CUSTOMER" as const
};

function createGateway() {
  const communication = {
    getRoomForTask: jest.fn(),
    sendMessage: jest.fn(),
    markMessagesRead: jest.fn()
  };
  const calls = {
    createCallSession: jest.fn(),
    acceptCall: jest.fn(),
    declineCall: jest.fn(),
    endCall: jest.fn(),
    authorizeCallSignal: jest.fn()
  };
  const jwt = {
    verifyAsync: jest.fn()
  };
  const gateway = new CommunicationGateway(
    communication as unknown as CommunicationService,
    calls as unknown as CallsService,
    jwt as unknown as JwtService
  );
  const emit = jest.fn();
  Object.assign(gateway as unknown as { server: unknown }, {
    server: {
      to: jest.fn(() => ({ emit }))
    }
  });

  return { calls, communication, emit, gateway, jwt };
}

function socket(): any {
  return {
    data: {},
    handshake: {
      auth: { token: "access-token" },
      headers: {}
    },
    join: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() }))
  };
}

describe("CommunicationGateway", () => {
  it("starts and authenticates socket connections", async () => {
    const { gateway, jwt } = createGateway();
    const client = socket();
    jwt.verifyAsync.mockResolvedValue({
      sub: socketUser.id,
      phoneNumber: socketUser.phoneNumber,
      role: socketUser.role,
      type: "access"
    });

    await gateway.handleConnection(client as never);

    expect(client.data.user).toEqual(socketUser);
  });

  it("joins an authorized task room", async () => {
    const { communication, gateway } = createGateway();
    const client = socket();
    client.data.user = socketUser;
    communication.getRoomForTask.mockResolvedValue({ id: "room-id" });

    const room = await gateway.handleJoin(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    });

    expect(client.join).toHaveBeenCalledWith("task:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    expect(room).toEqual({ id: "room-id" });
  });

  it("stores and broadcasts sent messages", async () => {
    const { communication, emit, gateway } = createGateway();
    const client = socket();
    client.data.user = socketUser;
    communication.sendMessage.mockResolvedValue({ id: "message-id", body: "Hello" });

    const message = await gateway.handleMessageSend(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      body: "Hello"
    });

    expect(message).toEqual({ id: "message-id", body: "Hello" });
    expect(emit).toHaveBeenCalledWith("task:message:new", message);
  });

  it("broadcasts typing placeholders to other room participants", async () => {
    const { communication, gateway } = createGateway();
    const client = socket();
    const peerEmit = jest.fn();
    client.data.user = socketUser;
    client.to = jest.fn(() => ({ emit: peerEmit }));
    communication.getRoomForTask.mockResolvedValue({ id: "room-id" });

    const event = await gateway.handleTyping(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      isTyping: true
    });

    expect(peerEmit).toHaveBeenCalledWith("task:typing", event);
    expect(event).toEqual({
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      userId: socketUser.id,
      isTyping: true
    });
  });

  it("marks messages read and broadcasts read receipts", async () => {
    const { communication, emit, gateway } = createGateway();
    const client = socket();
    client.data.user = socketUser;
    communication.markMessagesRead.mockResolvedValue({
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      messageIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"]
    });

    const receipt = await gateway.handleRead(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      messageIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"]
    });

    expect(emit).toHaveBeenCalledWith("task:read", receipt);
  });

  it("creates call sessions and emits ringing events", async () => {
    const { calls, emit, gateway } = createGateway();
    const client = socket();
    client.data.user = socketUser;
    calls.createCallSession.mockResolvedValue({
      id: "call-id",
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      status: "RINGING",
      rtcConfiguration: { iceServers: [] }
    });

    const event = await gateway.handleCallRequest(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      callType: "AUDIO"
    });

    expect(client.join).toHaveBeenCalledWith("task:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    expect(event.callId).toBe("call-id");
    expect(emit).toHaveBeenCalledWith("call:ringing", event);
  });

  it("accepts calls and emits call accept events", async () => {
    const { calls, emit, gateway } = createGateway();
    const client = socket();
    client.data.user = socketUser;
    calls.acceptCall.mockResolvedValue({
      id: "call-id",
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      status: "ACCEPTED",
      rtcConfiguration: { iceServers: [] }
    });

    const event = await gateway.handleCallAccept(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      callId: "call-id"
    });

    expect(event.call.status).toBe("ACCEPTED");
    expect(emit).toHaveBeenCalledWith("call:accept", event);
  });

  it("relays WebRTC offers to other task room participants", async () => {
    const { calls, gateway } = createGateway();
    const client = socket();
    const peerEmit = jest.fn();
    client.data.user = socketUser;
    client.to = jest.fn(() => ({ emit: peerEmit }));
    calls.authorizeCallSignal.mockResolvedValue({
      call: {
        id: "call-id",
        taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        status: "ACCEPTED"
      },
      rtcConfiguration: { iceServers: [] }
    });

    const event = await gateway.handleCallOffer(client as never, {
      taskId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      callId: "call-id",
      description: {
        type: "offer",
        sdp: "v=0..."
      }
    });

    expect(peerEmit).toHaveBeenCalledWith("call:offer", event);
    expect(event.description).toEqual({ type: "offer", sdp: "v=0..." });
    expect(event.rtcConfiguration).toEqual({ iceServers: [] });
  });
});
