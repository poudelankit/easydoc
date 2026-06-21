import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomInt } from "crypto";
import { QueryResultRow } from "pg";
import { resolveJwtSecret, shouldReturnDevOtp } from "../../common/config/security-env";
import { hashWithSecret, newTokenId } from "../../common/utils/hash.util";
import { normalizeNepalPhone } from "../../common/utils/phone.util";
import { ttlToDate } from "../../common/utils/ttl.util";
import { RequestContext, UserRole } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { RedisService } from "../redis/redis.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

interface UserRow extends QueryResultRow {
  id: string;
  phone_number: string;
  full_name: string;
  address_text: string | null;
  role: UserRole;
  status: string;
}

interface RefreshPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

@Injectable()
export class AuthService {
  private readonly jwtSecret = resolveJwtSecret();
  private readonly accessTtl = process.env.JWT_ACCESS_TTL ?? "15m";
  private readonly refreshTtl = process.env.JWT_REFRESH_TTL ?? "30d";

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService
  ) {}

  async sendOtp(dto: SendOtpDto, context: RequestContext) {
    const phoneNumber = normalizeNepalPhone(dto.phoneNumber);
    const rateKey = `otp:send:${phoneNumber}:${dto.purpose}`;
    const attempts = await this.redis.incrementWithExpiry(rateKey, 10 * 60);

    if (attempts > 5) {
      throw new HttpException("Too many OTP requests. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    const otp = process.env.SMS_PROVIDER === "local-mock" ? "123456" : String(randomInt(100000, 999999));
    const otpHash = hashWithSecret(otp, this.jwtSecret);

    await this.database.query(
      `INSERT INTO otp_verifications (phone_number, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')`,
      [phoneNumber, otpHash, dto.purpose]
    );

    await this.audit.write({
      action: "OTP_SENT",
      entityType: "otp_verifications",
      afterData: { phoneNumber, purpose: dto.purpose },
      context
    });

    return {
      success: true,
      retryAfterSeconds: 60,
      ...(shouldReturnDevOtp() ? { devOtp: otp } : {})
    };
  }

  async verifyOtp(dto: VerifyOtpDto, context: RequestContext) {
    const phoneNumber = normalizeNepalPhone(dto.phoneNumber);
    const purpose = dto.purpose ?? "LOGIN";

    const otpResult = await this.database.query<{
      id: string;
      otp_hash: string;
      attempts: number;
    }>(
      `SELECT id, otp_hash, attempts
       FROM otp_verifications
       WHERE phone_number = $1
         AND purpose = $2
         AND consumed_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber, purpose]
    );

    const otpRecord = otpResult.rows[0];
    if (!otpRecord) {
      throw new UnauthorizedException("OTP is invalid or expired");
    }

    if (otpRecord.attempts >= 5) {
      throw new HttpException("Too many OTP verification attempts", HttpStatus.TOO_MANY_REQUESTS);
    }

    const submittedHash = hashWithSecret(dto.otp, this.jwtSecret);
    if (submittedHash !== otpRecord.otp_hash) {
      await this.database.query("UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1", [
        otpRecord.id
      ]);
      throw new UnauthorizedException("OTP is invalid or expired");
    }

    await this.database.query("UPDATE otp_verifications SET consumed_at = NOW() WHERE id = $1", [otpRecord.id]);
    const user = await this.upsertActiveUser(phoneNumber);

    if (user.status === "SUSPENDED" || user.status === "DELETED") {
      throw new UnauthorizedException("User account is not active");
    }

    await this.audit.write({
      actorUserId: user.id,
      action: "OTP_VERIFIED",
      entityType: "users",
      entityId: user.id,
      afterData: { phoneNumber, purpose },
      context
    });

    return this.createAuthResponse(user, context);
  }

  async refresh(refreshToken: string, context: RequestContext) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: this.jwtSecret });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenHash = hashWithSecret(refreshToken, this.jwtSecret);
    const sessionResult = await this.database.query<{
      id: string;
      user_id: string;
      token_hash: string;
      revoked_at: Date | null;
      expires_at: Date;
    }>(
      `SELECT id, user_id, token_hash, revoked_at, expires_at
       FROM refresh_sessions
       WHERE jti = $1`,
      [payload.jti]
    );

    const session = sessionResult.rows[0];
    if (!session || session.revoked_at || session.token_hash !== tokenHash || session.expires_at < new Date()) {
      await this.audit.write({
        actorUserId: session?.user_id,
        action: "REFRESH_TOKEN_REUSE_REJECTED",
        entityType: "refresh_sessions",
        entityId: session?.id,
        afterData: { jti: payload.jti },
        context
      });
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.getUserById(session.user_id);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User account is not active");
    }

    await this.database.query("UPDATE refresh_sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);
    return this.createAuthResponse(user, context);
  }

  async logout(userId: string, refreshToken: string) {
    let payload: RefreshPayload | undefined;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: this.jwtSecret });
    } catch {
      return { success: true };
    }

    await this.database.query(
      `UPDATE refresh_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1 AND jti = $2 AND revoked_at IS NULL`,
      [userId, payload.jti]
    );

    return { success: true };
  }

  private async upsertActiveUser(phoneNumber: string): Promise<UserRow> {
    const result = await this.database.query<UserRow>(
      `INSERT INTO users (phone_number, role, status, last_login_at)
       VALUES ($1, 'CUSTOMER', 'ACTIVE', NOW())
       ON CONFLICT (phone_number)
       DO UPDATE SET
         status = CASE WHEN users.status = 'PENDING_OTP' THEN 'ACTIVE' ELSE users.status END,
         last_login_at = NOW(),
         updated_at = NOW()
       RETURNING id, phone_number, full_name, address_text, role, status`,
      [phoneNumber]
    );
    return result.rows[0];
  }

  private async getUserById(userId: string): Promise<UserRow | null> {
    const result = await this.database.query<UserRow>(
      `SELECT id, phone_number, full_name, address_text, role, status
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  private async createAuthResponse(user: UserRow, context: RequestContext) {
    if (!user.id || !user.phone_number) {
      throw new BadRequestException("User is invalid");
    }

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        phoneNumber: user.phone_number,
        role: user.role,
        type: "access"
      },
      { secret: this.jwtSecret, expiresIn: this.accessTtl }
    );

    const jti = newTokenId();
    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        jti,
        type: "refresh"
      },
      { secret: this.jwtSecret, expiresIn: this.refreshTtl }
    );

    const refreshSessionResult = await this.database.query<{ id: string }>(
      `INSERT INTO refresh_sessions (user_id, jti, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        user.id,
        jti,
        hashWithSecret(refreshToken, this.jwtSecret),
        ttlToDate(this.refreshTtl),
        context.ipAddress ?? null,
        context.userAgent ?? null
      ]
    );

    await this.audit.write({
      actorUserId: user.id,
      action: "SESSION_CREATED",
      entityType: "refresh_sessions",
      entityId: refreshSessionResult.rows[0]?.id,
      context
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        fullName: user.full_name,
        addressText: user.address_text,
        role: user.role,
        status: user.status,
        profileComplete: Boolean(user.full_name)
      }
    };
  }
}
