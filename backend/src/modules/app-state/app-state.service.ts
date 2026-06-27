import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { WorkflowProjectionService } from "./workflow-projection.service";

@Injectable()
export class AppStateService {
  private readonly logger = new Logger(AppStateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowProjectionService: WorkflowProjectionService,
    private readonly realtimeService: RealtimeService,
  ) {}

  findAll() {
    return this.prisma.masterDataRecord.findMany({
      where: {
        key: {
          startsWith: "workflow:",
        },
      },
      orderBy: { key: "asc" },
    });
  }

  findOne(key: string) {
    return this.prisma.masterDataRecord.findUnique({
      where: { key },
    });
  }

  async upsert(key: string, value: unknown, originClientId?: string) {
    const jsonValue = value as Prisma.InputJsonValue;

    const record = await this.prisma.masterDataRecord.upsert({
      where: { key },
      update: { value: jsonValue },
      create: { key, value: jsonValue },
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.workflowProjectionService.project(tx, key, value);
      });
    } catch (error) {
      this.logger.error(`Failed to project workflow state for ${key}`, error instanceof Error ? error.stack : undefined);
    }

    this.realtimeService.notifyResourceChanged("workflow-state", "upsert", {
      key,
      originClientId,
    });

    return record;
  }
}
