import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { AuthenticatedUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const loginName = username.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: loginName }, { email: loginName }],
      },
      include: {
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    const authUser = this.toAuthenticatedUser(user);

    return {
      accessToken: await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        {
          secret: this.configService.get<string>("JWT_SECRET"),
          expiresIn: (this.configService.get<string>("JWT_EXPIRES_IN", "1d") ?? "1d") as never,
        },
      ),
      user: authUser,
    };
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User account is inactive");
    }

    return this.toAuthenticatedUser(user);
  }

  async authenticateAccessToken(token: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
      secret: this.configService.get<string>("JWT_SECRET") ?? "venueops-dev-super-secret-key",
    });

    return this.getAuthenticatedUser(payload.sub);
  }

  private toAuthenticatedUser(
    user: User & {
      username: string | null;
      permissions: Array<{
        moduleKey: string;
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canApprove: boolean;
        canExport: boolean;
        canManage: boolean;
      }>;
    },
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions.map((permission) => ({
        moduleKey: permission.moduleKey,
        canView: permission.canView,
        canCreate: permission.canCreate,
        canEdit: permission.canEdit,
        canDelete: permission.canDelete,
        canApprove: permission.canApprove,
        canExport: permission.canExport,
        canManage: permission.canManage,
      })),
    };
  }
}
