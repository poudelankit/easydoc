import { Injectable, NotFoundException } from "@nestjs/common";
import { QueryResultRow } from "pg";
import { RequestContext, UserRole } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";

export interface UserProfile {
  id: string;
  phoneNumber: string;
  fullName: string;
  addressText: string | null;
  role: UserRole;
  status: string;
  profilePhotoUrl: string | null;
}

interface UserRow extends QueryResultRow {
  id: string;
  phone_number: string;
  full_name: string;
  address_text: string | null;
  role: UserRole;
  status: string;
  profile_photo_url: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const result = await this.database.query<UserRow>(
      `SELECT id, phone_number, full_name, address_text, role, status, profile_photo_url
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("User not found");
    }

    return this.mapUser(row);
  }

  async updateProfile(
    userId: string,
    params: { fullName?: string; addressText?: string; profilePhotoUrl?: string },
    context?: RequestContext
  ): Promise<UserProfile> {
    const before = await this.getProfile(userId);
    const result = await this.database.query<UserRow>(
      `UPDATE users
       SET
         full_name = COALESCE($2, full_name),
         address_text = COALESCE($3, address_text),
         profile_photo_url = COALESCE($4, profile_photo_url),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, phone_number, full_name, address_text, role, status, profile_photo_url`,
      [userId, params.fullName ?? null, params.addressText ?? null, params.profilePhotoUrl ?? null]
    );

    const after = this.mapUser(result.rows[0]);
    await this.audit.write({
      actorUserId: userId,
      action: "USER_PROFILE_UPDATED",
      entityType: "users",
      entityId: userId,
      beforeData: before,
      afterData: after,
      context
    });
    return after;
  }

  async setRole(userId: string, role: UserRole): Promise<void> {
    await this.database.query("UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1", [userId, role]);
  }

  private mapUser(row: UserRow): UserProfile {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      fullName: row.full_name,
      addressText: row.address_text,
      role: row.role,
      status: row.status,
      profilePhotoUrl: row.profile_photo_url
    };
  }
}
