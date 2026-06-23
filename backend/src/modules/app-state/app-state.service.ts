import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { WorkflowProjectionService } from "./workflow-projection.service";

@Injectable()
export class AppStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowProjectionService: WorkflowProjectionService,
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

  upsert(key: string, value: unknown) {
    const jsonValue = value as Prisma.InputJsonValue;

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.masterDataRecord.upsert({
        where: { key },
        update: { value: jsonValue },
        create: { key, value: jsonValue },
      });

      await this.workflowProjectionService.project(tx, key, value);

      return record;
    });
  }
}
