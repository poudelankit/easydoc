import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { QueryResultRow } from "pg";
import { RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import { UsersService } from "../users/users.service";
import { CreateUploadPlaceholderDto } from "./dto/create-upload-placeholder.dto";
import { RegisterAgentDto } from "./dto/register-agent.dto";
import { UpdateCurrentLocationDto } from "./dto/update-current-location.dto";

interface FileMetadataRow extends QueryResultRow {
  id: string;
  object_key: string;
  context: string;
  status: string;
}

interface AgentProfileRow extends QueryResultRow {
  id: string;
  user_id: string;
  citizenship_number: string;
  citizenship_front_url: string;
  citizenship_back_url: string;
  selfie_url: string;
  permanent_address_text: string;
  permanent_latitude: number | null;
  permanent_longitude: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  status: string;
  average_rating: string;
  completed_task_count: number;
  cancelled_task_count: number;
  is_available: boolean;
}

@Injectable()
export class AgentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
    private readonly audit: AuditService
  ) {}

  async createUploadPlaceholder(
    userId: string,
    dto: CreateUploadPlaceholderDto,
    context: RequestContext
  ) {
    const extension = this.extensionForMime(dto.mimeType);
    const objectKey = this.storage.buildKycPlaceholderKey(userId, dto.kind, extension);
    const result = await this.database.query<FileMetadataRow>(
      `INSERT INTO file_metadata
        (uploaded_by_user_id, context, object_key, original_filename, mime_type, size_bytes, status)
       VALUES ($1, 'KYC', $2, $3, $4, $5, 'PLACEHOLDER')
       RETURNING id, object_key, context, status`,
      [userId, objectKey, dto.originalFilename ?? null, dto.mimeType, dto.sizeBytes]
    );

    const file = result.rows[0];
    await this.audit.write({
      actorUserId: userId,
      action: "KYC_UPLOAD_PLACEHOLDER_CREATED",
      entityType: "file_metadata",
      entityId: file.id,
      afterData: { kind: dto.kind, objectKey, mimeType: dto.mimeType, sizeBytes: dto.sizeBytes },
      context
    });

    return {
      fileId: file.id,
      objectKey: file.object_key,
      status: file.status,
      uploadMode: "placeholder"
    };
  }

  async register(userId: string, dto: RegisterAgentDto, context: RequestContext) {
    const files = await this.loadKycFiles(userId, [
      dto.citizenshipFrontFileId,
      dto.citizenshipBackFileId,
      dto.selfieFileId
    ]);

    const before = await this.users.getProfile(userId);

    const result = await this.database.transaction(async (client) => {
      await client.query(
        `UPDATE users
         SET role = 'AGENT', full_name = $2, address_text = $3, updated_at = NOW()
         WHERE id = $1`,
        [userId, dto.fullName, dto.permanentAddressText]
      );

      const profileResult = await client.query<AgentProfileRow>(
        `INSERT INTO agent_profiles (
           user_id,
           citizenship_number,
           citizenship_front_url,
           citizenship_back_url,
           selfie_url,
           permanent_address_text,
           permanent_location,
           status
         )
         VALUES (
           $1, $2, $3, $4, $5, $6,
           ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography,
           'PENDING_VERIFICATION'
         )
         ON CONFLICT (user_id)
         DO UPDATE SET
           citizenship_number = EXCLUDED.citizenship_number,
           citizenship_front_url = EXCLUDED.citizenship_front_url,
           citizenship_back_url = EXCLUDED.citizenship_back_url,
           selfie_url = EXCLUDED.selfie_url,
           permanent_address_text = EXCLUDED.permanent_address_text,
           permanent_location = EXCLUDED.permanent_location,
           status = 'PENDING_VERIFICATION',
           verification_notes = NULL,
           updated_at = NOW()
         RETURNING
           id, user_id, citizenship_number, citizenship_front_url, citizenship_back_url, selfie_url,
           permanent_address_text,
           ST_Y(permanent_location::geometry) AS permanent_latitude,
           ST_X(permanent_location::geometry) AS permanent_longitude,
           ST_Y(current_location::geometry) AS current_latitude,
           ST_X(current_location::geometry) AS current_longitude,
           status, average_rating, completed_task_count, cancelled_task_count, is_available`,
        [
          userId,
          dto.citizenshipNumber,
          files[0].object_key,
          files[1].object_key,
          files[2].object_key,
          dto.permanentAddressText,
          dto.permanentLatitude,
          dto.permanentLongitude
        ]
      );

      if (dto.serviceTags?.length) {
        await client.query("DELETE FROM agent_service_tags WHERE agent_id = $1", [profileResult.rows[0].id]);
        for (const tag of dto.serviceTags) {
          await client.query(
            `INSERT INTO agent_service_tags (agent_id, tag)
             VALUES ($1, $2)
             ON CONFLICT (agent_id, tag) DO NOTHING`,
            [profileResult.rows[0].id, tag.trim()]
          );
        }
      }

      return profileResult.rows[0];
    });

    await this.audit.write({
      actorUserId: userId,
      action: "AGENT_KYC_SUBMITTED",
      entityType: "agent_profiles",
      entityId: result.id,
      beforeData: before,
      afterData: {
        status: result.status,
        permanentAddressText: result.permanent_address_text,
        permanentLatitude: result.permanent_latitude,
        permanentLongitude: result.permanent_longitude
      },
      context
    });

    return this.mapProfile(result);
  }

  async getAgentProfileByUserId(userId: string) {
    const result = await this.database.query<AgentProfileRow>(
      `SELECT
         id, user_id, citizenship_number, citizenship_front_url, citizenship_back_url, selfie_url,
         permanent_address_text,
         ST_Y(permanent_location::geometry) AS permanent_latitude,
         ST_X(permanent_location::geometry) AS permanent_longitude,
         ST_Y(current_location::geometry) AS current_latitude,
         ST_X(current_location::geometry) AS current_longitude,
         status, average_rating, completed_task_count, cancelled_task_count, is_available
       FROM agent_profiles
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Agent profile not found");
    }

    return this.mapProfile(row);
  }

  async updateCurrentLocation(userId: string, dto: UpdateCurrentLocationDto) {
    const result = await this.database.query<AgentProfileRow>(
      `UPDATE agent_profiles
       SET
         current_location = ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
         updated_at = NOW()
       WHERE user_id = $1
       RETURNING
         id, user_id, citizenship_number, citizenship_front_url, citizenship_back_url, selfie_url,
         permanent_address_text,
         ST_Y(permanent_location::geometry) AS permanent_latitude,
         ST_X(permanent_location::geometry) AS permanent_longitude,
         ST_Y(current_location::geometry) AS current_latitude,
         ST_X(current_location::geometry) AS current_longitude,
         status, average_rating, completed_task_count, cancelled_task_count, is_available`,
      [userId, dto.latitude, dto.longitude]
    );

    if (!result.rows[0]) {
      throw new NotFoundException("Agent profile not found");
    }

    return this.mapProfile(result.rows[0]);
  }

  private async loadKycFiles(userId: string, fileIds: string[]) {
    const result = await this.database.query<FileMetadataRow>(
      `SELECT id, object_key, context, status
       FROM file_metadata
       WHERE uploaded_by_user_id = $1 AND id = ANY($2::uuid[]) AND context = 'KYC'`,
      [userId, fileIds]
    );

    if (result.rows.length !== fileIds.length) {
      throw new BadRequestException("All KYC file placeholders must belong to the authenticated user");
    }

    return fileIds.map((id) => {
      const file = result.rows.find((row) => row.id === id);
      if (!file) {
        throw new BadRequestException("KYC file placeholder is missing");
      }
      return file;
    });
  }

  private extensionForMime(mimeType: string) {
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf"
    };

    const extension = allowed[mimeType];
    if (!extension) {
      throw new BadRequestException("KYC placeholder only supports JPEG, PNG, or PDF");
    }
    return extension;
  }

  private mapProfile(row: AgentProfileRow) {
    return {
      id: row.id,
      userId: row.user_id,
      citizenshipNumber: row.citizenship_number,
      citizenshipFrontObjectKey: row.citizenship_front_url,
      citizenshipBackObjectKey: row.citizenship_back_url,
      selfieObjectKey: row.selfie_url,
      permanentAddressText: row.permanent_address_text,
      permanentLocation: {
        latitude: Number(row.permanent_latitude),
        longitude: Number(row.permanent_longitude)
      },
      currentLocation:
        row.current_latitude !== null && row.current_longitude !== null
          ? {
              latitude: Number(row.current_latitude),
              longitude: Number(row.current_longitude)
            }
          : null,
      status: row.status,
      averageRating: Number(row.average_rating),
      completedTaskCount: row.completed_task_count,
      cancelledTaskCount: row.cancelled_task_count,
      isAvailable: row.is_available
    };
  }
}
