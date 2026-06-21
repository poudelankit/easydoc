import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { resolveJwtSecret } from "../config/security-env";
import { AuthenticatedUser } from "../types/authenticated-user";

interface AccessTokenPayload {
  sub: string;
  phoneNumber: string;
  role: AuthenticatedUser["role"];
  type: "access";
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwt = new JwtService({
    secret: resolveJwtSecret()
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      if (payload.type !== "access") {
        throw new UnauthorizedException("Invalid access token");
      }
      request.user = {
        id: payload.sub,
        phoneNumber: payload.phoneNumber,
        role: payload.role
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
