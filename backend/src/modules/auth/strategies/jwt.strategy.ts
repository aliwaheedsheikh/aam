import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthenticatedUser, toAuthenticatedUser } from "../auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // L-2: Fail fast if JWT_SECRET is not configured — no hardcoded fallback.
    const jwtSecret = configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new Error("FATAL: JWT_SECRET environment variable is not set. Refusing to start.");
    }

    super({
      // S-1: Accept token from either HttpOnly cookie (preferred) or Bearer header.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.["venueops_token"] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User account is inactive");
    }

    // A-7: Use the shared mapper instead of duplicating the mapping logic.
    return toAuthenticatedUser(user);
  }
}
