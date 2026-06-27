import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { Server as HttpServer, IncomingMessage } from "http";
import { Duplex } from "stream";
import { URL } from "url";
import { AuthenticatedUser } from "../auth/auth.types";
import { AuthService } from "../auth/auth.service";

type LiveSyncResource = "master-data" | "workflow-state" | "bookings" | "service-bookings";
type LiveSyncAction = "upsert" | "delete" | "bulk-sync";

type LiveSyncEvent = {
  type: "resource.changed";
  resource: LiveSyncResource;
  action: LiveSyncAction;
  key?: string;
  recordId?: string;
  timestamp: string;
};

type AuthMessage = {
  type?: string;
  token?: string;
  clientId?: string;
};

type RealtimeClient = {
  id: string;
  socket: Duplex;
  buffer: Buffer;
  authenticatedUser?: AuthenticatedUser;
  clientInstanceId?: string;
};

const WS_MAGIC_STRING = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly clients = new Map<string, RealtimeClient>();
  private attached = false;

  constructor(private readonly authService: AuthService) {}

  attachServer(server: HttpServer) {
    if (this.attached) {
      return;
    }

    this.attached = true;
    server.on("upgrade", (request, socket) => {
      void this.handleUpgrade(request, socket);
    });
  }

  notifyResourceChanged(
    resource: LiveSyncResource,
    action: LiveSyncAction,
    options?: {
      key?: string;
      recordId?: string;
      originClientId?: string;
    },
  ) {
    const event: LiveSyncEvent = {
      type: "resource.changed",
      resource,
      action,
      key: options?.key,
      recordId: options?.recordId,
      timestamp: new Date().toISOString(),
    };

    for (const client of this.clients.values()) {
      if (!client.authenticatedUser) {
        continue;
      }

      if (options?.originClientId && client.clientInstanceId === options.originClientId) {
        continue;
      }

      this.sendJson(client.socket, event);
    }
  }

  private async handleUpgrade(request: IncomingMessage, socket: Duplex) {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      if (requestUrl.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      const websocketKey = request.headers["sec-websocket-key"];
      if (!websocketKey || Array.isArray(websocketKey)) {
        socket.destroy();
        return;
      }

      const acceptKey = createHash("sha1")
        .update(`${websocketKey}${WS_MAGIC_STRING}`)
        .digest("base64");

      socket.write(
        [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${acceptKey}`,
          "",
          "",
        ].join("\r\n"),
      );

      const clientId = this.generateClientId();
      const client: RealtimeClient = {
        id: clientId,
        socket,
        buffer: Buffer.alloc(0),
      };
      this.clients.set(clientId, client);

      this.sendJson(socket, { type: "connection.ready" });

      socket.on("data", (chunk) => {
        void this.handleClientData(clientId, chunk);
      });
      socket.on("close", () => {
        this.clients.delete(clientId);
      });
      socket.on("end", () => {
        this.clients.delete(clientId);
      });
      socket.on("error", (error) => {
        this.logger.warn(`Realtime socket error for client ${clientId}: ${error.message}`);
        this.clients.delete(clientId);
      });
    } catch (error) {
      this.logger.warn(`Realtime upgrade failed: ${error instanceof Error ? error.message : "unknown error"}`);
      socket.destroy();
    }
  }

  private async handleClientData(clientId: string, chunk: Buffer) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    client.buffer = Buffer.concat([client.buffer, chunk]);
    const parsedFrames = this.parseFrames(client.buffer);
    client.buffer = parsedFrames.remaining;

    for (const frame of parsedFrames.frames) {
      if (frame.opcode === 0x8) {
        client.socket.end();
        this.clients.delete(clientId);
        return;
      }

      if (frame.opcode === 0x9) {
        this.sendFrame(client.socket, frame.payload, 0x0a);
        continue;
      }

      if (frame.opcode !== 0x1) {
        continue;
      }

      let message: AuthMessage;
      try {
        message = JSON.parse(frame.payload.toString("utf8")) as AuthMessage;
      } catch {
        continue;
      }

      if (message.type !== "auth" || !message.token) {
        continue;
      }

      try {
        const authenticatedUser = await this.authService.authenticateAccessToken(message.token);
        client.authenticatedUser = authenticatedUser;
        client.clientInstanceId = typeof message.clientId === "string" ? message.clientId : undefined;
        this.sendJson(client.socket, { type: "connection.authenticated" });
      } catch {
        this.sendJson(client.socket, { type: "connection.error", message: "Authentication failed" });
        client.socket.end();
        this.clients.delete(clientId);
        return;
      }
    }
  }

  private parseFrames(buffer: Buffer) {
    const frames: Array<{ opcode: number; payload: Buffer }> = [];
    let offset = 0;

    while (offset + 2 <= buffer.length) {
      const firstByte = buffer[offset];
      const secondByte = buffer[offset + 1];
      const opcode = firstByte & 0x0f;
      const masked = (secondByte & 0x80) === 0x80;

      let payloadLength = secondByte & 0x7f;
      let frameHeaderLength = 2;

      if (payloadLength === 126) {
        if (offset + 4 > buffer.length) {
          break;
        }

        payloadLength = buffer.readUInt16BE(offset + 2);
        frameHeaderLength = 4;
      } else if (payloadLength === 127) {
        if (offset + 10 > buffer.length) {
          break;
        }

        const longLength = Number(buffer.readBigUInt64BE(offset + 2));
        if (!Number.isSafeInteger(longLength)) {
          break;
        }

        payloadLength = longLength;
        frameHeaderLength = 10;
      }

      const maskingKeyLength = masked ? 4 : 0;
      const frameLength = frameHeaderLength + maskingKeyLength + payloadLength;
      if (offset + frameLength > buffer.length) {
        break;
      }

      const maskingKey = masked
        ? buffer.subarray(offset + frameHeaderLength, offset + frameHeaderLength + 4)
        : null;
      const payloadStart = offset + frameHeaderLength + maskingKeyLength;
      const payload = Buffer.from(buffer.subarray(payloadStart, payloadStart + payloadLength));

      if (masked && maskingKey) {
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= maskingKey[index % 4];
        }
      }

      frames.push({ opcode, payload });
      offset += frameLength;
    }

    return {
      frames,
      remaining: buffer.subarray(offset),
    };
  }

  private sendJson(socket: Duplex, value: unknown) {
    this.sendFrame(socket, Buffer.from(JSON.stringify(value), "utf8"), 0x1);
  }

  private sendFrame(socket: Duplex, payload: Buffer, opcode: number) {
    const payloadLength = payload.length;
    let header: Buffer;

    if (payloadLength < 126) {
      header = Buffer.from([0x80 | opcode, payloadLength]);
    } else if (payloadLength < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(payloadLength, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payloadLength), 2);
    }

    socket.write(Buffer.concat([header, payload]));
  }

  private generateClientId() {
    return `rt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
