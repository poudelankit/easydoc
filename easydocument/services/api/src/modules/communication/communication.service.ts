import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient, QueryResultRow } from "pg";
import { AuthenticatedUser, RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import {
  CommunicationAttachmentType,
  CreateAttachmentPlaceholderDto
} from "./dto/create-attachment-placeholder.dto";
import { CreateMessageDto } from "./dto/create-message.dto";

interface CommunicationRoomRow extends QueryResultRow {
  id: string;
  task_id: string;
  task_name: string;
  customer_user_id: string;
  customer_full_name: string;
  customer_phone_number: string;
  agent_user_id: string;
  agent_full_name: string;
  agent_phone_number: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface MessageRow extends QueryResultRow {
  id: string;
  room_id: string;
  task_id: string;
  sender_user_id: string;
  sender_full_name: string;
  body: string;
  message_type: "TEXT";
  attachments: unknown;
  read_by: unknown;
  created_at: Date | string;
}

interface AttachmentRow extends QueryResultRow {
  id: string;
  room_id: string;
  uploaded_by_user_id: string;
  file_metadata_id: string;
  attachment_type: CommunicationAttachmentType;
  object_key: string;
  original_filename: string | null;
  mime_type: string;
  size_bytes: string | number;
  status: string;
  created_at: Date | string;
}

interface ReadReceiptRow extends QueryResultRow {
  message_id: string;
  read_at: Date | string;
}

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{
    rows: T[];
  }>;
}

@Injectable()
export class CommunicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly audit: AuditService
  ) {}

  async ensureRoomForAcceptedTask(taskId: string, client?: QueryExecutor) {
    const executor = client ?? this.database;
    await executor.query(
      `INSERT INTO communication_rooms (task_id, customer_user_id, agent_user_id)
       SELECT id, customer_user_id, assigned_agent_user_id
       FROM document_tasks
       WHERE id = $1
         AND status = 'ACCEPTED'
         AND assigned_agent_user_id IS NOT NULL
       ON CONFLICT (task_id) DO NOTHING`,
      [taskId]
    );

    const room = await this.loadRoomByTaskId(taskId, executor);
    if (!room) {
      throw new BadRequestException("Accepted task with assigned agent is required before creating a room");
    }
    return this.mapRoom(room);
  }

  async getRoomForTask(taskId: string, user: AuthenticatedUser) {
    return this.mapRoom(await this.getAuthorizedRoom(taskId, user));
  }

  async listMessages(taskId: string, user: AuthenticatedUser) {
    const room = await this.getAuthorizedRoom(taskId, user);
    const result = await this.database.query<MessageRow>(
      `${this.messageSelect()}
       FROM communication_messages message
       JOIN users sender_user ON sender_user.id = message.sender_user_id
       JOIN communication_rooms room ON room.id = message.room_id
       WHERE message.room_id = $1
       ORDER BY message.created_at ASC`,
      [room.id]
    );

    return result.rows.map((row) => this.mapMessage(row));
  }

  async sendMessage(
    taskId: string,
    user: AuthenticatedUser,
    dto: CreateMessageDto,
    context?: RequestContext
  ) {
    const room = await this.getAuthorizedRoom(taskId, user);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException("Message body is required");
    }

    const attachmentIds = dto.attachmentIds ?? [];
    const messageId = await this.database.transaction(async (client) => {
      const messageResult = await client.query<{ id: string }>(
        `INSERT INTO communication_messages (room_id, sender_user_id, body, message_type)
         VALUES ($1, $2, $3, 'TEXT')
         RETURNING id`,
        [room.id, user.id, body]
      );

      const message = messageResult.rows[0];
      if (!message) {
        throw new BadRequestException("Message could not be created");
      }

      await client.query(
        `INSERT INTO communication_message_reads (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, user_id) DO NOTHING`,
        [message.id, user.id]
      );

      if (attachmentIds.length) {
        const attachmentResult = await client.query<{ id: string }>(
          `SELECT id
           FROM communication_attachments
           WHERE room_id = $1 AND id = ANY($2::uuid[])`,
          [room.id, attachmentIds]
        );

        if (attachmentResult.rows.length !== attachmentIds.length) {
          throw new BadRequestException("All attachments must belong to this communication room");
        }

        for (const attachmentId of attachmentIds) {
          await client.query(
            `INSERT INTO communication_message_attachments (message_id, attachment_id)
             VALUES ($1, $2)
             ON CONFLICT (message_id, attachment_id) DO NOTHING`,
            [message.id, attachmentId]
          );
        }
      }

      return message.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "CHAT_MESSAGE_CREATED",
      entityType: "communication_messages",
      entityId: messageId,
      afterData: { taskId, roomId: room.id, attachmentCount: attachmentIds.length },
      context
    });

    return this.getMessageById(room.id, messageId);
  }

  async createAttachmentPlaceholder(
    taskId: string,
    user: AuthenticatedUser,
    dto: CreateAttachmentPlaceholderDto,
    context: RequestContext
  ) {
    const room = await this.getAuthorizedRoom(taskId, user);
    const extension = this.extensionForAttachment(dto.attachmentType, dto.mimeType);
    const objectKey = this.storage.buildCommunicationAttachmentPlaceholderKey(
      user.id,
      taskId,
      dto.attachmentType,
      extension
    );

    const attachment = await this.database.transaction(async (client) => {
      const fileResult = await client.query<{
        id: string;
        object_key: string;
        original_filename: string | null;
        mime_type: string;
        size_bytes: string | number;
        status: string;
      }>(
        `INSERT INTO file_metadata (
           uploaded_by_user_id,
           context,
           object_key,
           original_filename,
           mime_type,
           size_bytes,
           status
         )
         VALUES ($1, 'CHAT_ATTACHMENT', $2, $3, $4, $5, 'PLACEHOLDER')
         RETURNING id, object_key, original_filename, mime_type, size_bytes, status`,
        [
          user.id,
          objectKey,
          dto.originalFilename ?? dto.label ?? "chat-attachment",
          dto.mimeType,
          dto.sizeBytes
        ]
      );

      const file = fileResult.rows[0];
      if (!file) {
        throw new BadRequestException("Attachment placeholder could not be created");
      }

      const attachmentResult = await client.query<AttachmentRow>(
        `INSERT INTO communication_attachments (
           room_id,
           uploaded_by_user_id,
           file_metadata_id,
           attachment_type
         )
         VALUES ($1, $2, $3, $4)
         RETURNING
           id,
           room_id,
           uploaded_by_user_id,
           file_metadata_id,
           attachment_type,
           $5::text AS object_key,
           $6::text AS original_filename,
           $7::text AS mime_type,
           $8::bigint AS size_bytes,
           $9::text AS status,
           created_at`,
        [
          room.id,
          user.id,
          file.id,
          dto.attachmentType,
          file.object_key,
          file.original_filename,
          file.mime_type,
          file.size_bytes,
          file.status
        ]
      );

      return attachmentResult.rows[0];
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "CHAT_ATTACHMENT_PLACEHOLDER_CREATED",
      entityType: "communication_attachments",
      entityId: attachment.id,
      afterData: {
        taskId,
        roomId: room.id,
        attachmentType: dto.attachmentType,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes
      },
      context
    });

    return {
      ...this.mapAttachment(attachment),
      uploadMode: "placeholder"
    };
  }

  async markMessagesRead(taskId: string, user: AuthenticatedUser, messageIds?: string[]) {
    const room = await this.getAuthorizedRoom(taskId, user);
    const ids = messageIds?.length ? messageIds : null;
    const result = await this.database.query<ReadReceiptRow>(
      `INSERT INTO communication_message_reads (message_id, user_id, read_at)
       SELECT id, $2, NOW()
       FROM communication_messages
       WHERE room_id = $1
         AND sender_user_id <> $2
         AND ($3::uuid[] IS NULL OR id = ANY($3::uuid[]))
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET read_at = EXCLUDED.read_at
       RETURNING message_id, read_at`,
      [room.id, user.id, ids]
    );

    return {
      taskId,
      roomId: room.id,
      readerUserId: user.id,
      messageIds: result.rows.map((row) => row.message_id),
      readAt: result.rows[0] ? this.dateToIso(result.rows[0].read_at) : null
    };
  }

  private async getMessageById(roomId: string, messageId: string) {
    const result = await this.database.query<MessageRow>(
      `${this.messageSelect()}
       FROM communication_messages message
       JOIN users sender_user ON sender_user.id = message.sender_user_id
       JOIN communication_rooms room ON room.id = message.room_id
       WHERE message.room_id = $1 AND message.id = $2
       LIMIT 1`,
      [roomId, messageId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Message not found");
    }
    return this.mapMessage(row);
  }

  private async getAuthorizedRoom(taskId: string, user: AuthenticatedUser) {
    const result = await this.database.query<CommunicationRoomRow>(
      `${this.roomSelect()}
       WHERE room.task_id = $1
         AND ($2::uuid = room.customer_user_id OR $2::uuid = room.agent_user_id)
       LIMIT 1`,
      [taskId, user.id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Communication room not found");
    }
    return row;
  }

  private async loadRoomByTaskId(taskId: string, executor: QueryExecutor) {
    const result = await executor.query<CommunicationRoomRow>(
      `${this.roomSelect()}
       WHERE room.task_id = $1
       LIMIT 1`,
      [taskId]
    );
    return result.rows[0] ?? null;
  }

  private roomSelect() {
    return `SELECT
        room.id,
        room.task_id,
        task.task_name,
        room.customer_user_id,
        customer_user.full_name AS customer_full_name,
        customer_user.phone_number AS customer_phone_number,
        room.agent_user_id,
        agent_user.full_name AS agent_full_name,
        agent_user.phone_number AS agent_phone_number,
        room.created_at,
        room.updated_at
      FROM communication_rooms room
      JOIN document_tasks task ON task.id = room.task_id
      JOIN users customer_user ON customer_user.id = room.customer_user_id
      JOIN users agent_user ON agent_user.id = room.agent_user_id`;
  }

  private messageSelect() {
    return `SELECT
        message.id,
        message.room_id,
        room.task_id,
        message.sender_user_id,
        sender_user.full_name AS sender_full_name,
        message.body,
        message.message_type,
        message.created_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', attachment.id,
                'attachmentType', attachment.attachment_type,
                'fileId', file_metadata.id,
                'objectKey', file_metadata.object_key,
                'originalFilename', file_metadata.original_filename,
                'mimeType', file_metadata.mime_type,
                'sizeBytes', file_metadata.size_bytes,
                'status', file_metadata.status
              )
              ORDER BY attachment.created_at ASC
            )
            FROM communication_message_attachments message_attachment
            JOIN communication_attachments attachment ON attachment.id = message_attachment.attachment_id
            JOIN file_metadata ON file_metadata.id = attachment.file_metadata_id
            WHERE message_attachment.message_id = message.id
          ),
          '[]'::jsonb
        ) AS attachments,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'userId', read_receipt.user_id,
                'readAt', read_receipt.read_at
              )
              ORDER BY read_receipt.read_at ASC
            )
            FROM communication_message_reads read_receipt
            WHERE read_receipt.message_id = message.id
          ),
          '[]'::jsonb
        ) AS read_by`;
  }

  private extensionForAttachment(type: CommunicationAttachmentType, mimeType: string) {
    const allowed: Record<CommunicationAttachmentType, Record<string, string>> = {
      IMAGE: {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
      },
      DOCUMENT: {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
      },
      AUDIO: {
        "audio/aac": "aac",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/wav": "wav",
        "audio/webm": "webm"
      },
      VIDEO: {
        "video/mp4": "mp4",
        "video/quicktime": "mov",
        "video/webm": "webm"
      }
    };

    const extension = allowed[type][mimeType];
    if (!extension) {
      throw new BadRequestException(`${type} attachment placeholder does not support ${mimeType}`);
    }
    return extension;
  }

  private mapRoom(row: CommunicationRoomRow) {
    return {
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      participants: {
        customer: {
          userId: row.customer_user_id,
          fullName: row.customer_full_name,
          phoneNumber: row.customer_phone_number
        },
        agent: {
          userId: row.agent_user_id,
          fullName: row.agent_full_name,
          phoneNumber: row.agent_phone_number
        }
      },
      createdAt: this.dateToIso(row.created_at),
      updatedAt: this.dateToIso(row.updated_at)
    };
  }

  private mapMessage(row: MessageRow) {
    return {
      id: row.id,
      roomId: row.room_id,
      taskId: row.task_id,
      sender: {
        userId: row.sender_user_id,
        fullName: row.sender_full_name
      },
      body: row.body,
      messageType: row.message_type,
      attachments: this.parseJsonArray(row.attachments).map((attachment) =>
        this.mapAttachmentRecord(attachment)
      ),
      readBy: this.parseJsonArray(row.read_by).map((read) => ({
        userId: String(read.userId),
        readAt: this.dateToIso(String(read.readAt))
      })),
      createdAt: this.dateToIso(row.created_at)
    };
  }

  private mapAttachment(row: AttachmentRow) {
    return {
      id: row.id,
      roomId: row.room_id,
      uploadedByUserId: row.uploaded_by_user_id,
      attachmentType: row.attachment_type,
      fileId: row.file_metadata_id,
      objectKey: row.object_key,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      status: row.status,
      createdAt: this.dateToIso(row.created_at)
    };
  }

  private mapAttachmentRecord(record: Record<string, unknown>) {
    return {
      id: String(record.id),
      attachmentType: String(record.attachmentType),
      fileId: String(record.fileId),
      objectKey: String(record.objectKey),
      originalFilename: record.originalFilename === null ? null : String(record.originalFilename),
      mimeType: String(record.mimeType),
      sizeBytes: Number(record.sizeBytes),
      status: String(record.status)
    };
  }

  private parseJsonArray(value: unknown): Array<Record<string, unknown>> {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  }

  private dateToIso(value: Date | string) {
    return new Date(value).toISOString();
  }
}
