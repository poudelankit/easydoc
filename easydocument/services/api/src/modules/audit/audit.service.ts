import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { RequestContext } from "../../common/types/authenticated-user";

@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async write(params: {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    beforeData?: unknown;
    afterData?: unknown;
    context?: RequestContext;
  }): Promise<void> {
    await this.database.query(
      `INSERT INTO audit_logs
        (actor_user_id, action, entity_type, entity_id, ip_address, user_agent, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [
        params.actorUserId ?? null,
        params.action,
        params.entityType,
        params.entityId ?? null,
        params.context?.ipAddress ?? null,
        params.context?.userAgent ?? null,
        params.beforeData ? JSON.stringify(params.beforeData) : null,
        params.afterData ? JSON.stringify(params.afterData) : null
      ]
    );
  }
}
