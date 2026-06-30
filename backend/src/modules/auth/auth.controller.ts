import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * S-1: Token is set as an HttpOnly cookie — never exposed to JavaScript.
   * S-2: Login is rate-limited to 5 attempts per 60 seconds per IP.
   *      The JWT access token is still returned in the response body for
   *      clients that cannot use cookies (e.g. the existing LAN clients),
   *      but the HttpOnly cookie is the preferred auth path.
   */
  @Public()
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // S-1: Set the token as an HttpOnly, Secure, SameSite=Strict cookie.
    res.cookie("venueops_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    // Return the user object + token (token kept for backwards-compatible clients).
    return result;
  }

  @Get("me")
  me(@CurrentUser() user: { id: string }) {
    return this.authService.getAuthenticatedUser(user.id);
  }
}
