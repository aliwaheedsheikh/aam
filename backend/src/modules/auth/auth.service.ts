import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { AuthenticatedUser, toAuthenticatedUser } from "./auth.types";

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
    // A-7: Use the shared mapper.
    const authUser = toAuthenticatedUser(user);

    // L-2: No fallback — if JWT_SECRET is missing the app would have already crashed at startup.
    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      {
        secret: jwtSecret,
        expiresIn: (this.configService.get<string>("JWT_EXPIRES_IN", "1d") ?? "1d") as never,
      },
    );

    return {
      accessToken,
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

    // A-7: Use the shared mapper.
    return toAuthenticatedUser(user);
  }

  async authenticateAccessToken(token: string) {
    // L-2: No hardcoded fallback secret. If JWT_SECRET is missing, the app already refused to start.
    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
      secret: jwtSecret,
    });

    return this.getAuthenticatedUser(payload.sub);
  }
}
