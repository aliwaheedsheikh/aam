import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * D-2: Health endpoint extended to verify DB connectivity.
 * Container orchestrators (ECS, Kubernetes, Docker Compose) use this
 * endpoint to determine when the container is healthy and ready for traffic.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        service: "venueops-backend",
        db: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "degraded",
        service: "venueops-backend",
        db: "disconnected",
        error: error instanceof Error ? error.message : "Unknown DB error",
        timestamp: new Date().toISOString(),
      };
    }
  }
}
