import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { MasterDataProjectionService } from "./master-data-projection.service";

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masterDataProjectionService: MasterDataProjectionService,
  ) {}

  findAll() {
    return this.prisma.masterDataRecord.findMany({
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

      await this.masterDataProjectionService.project(tx, key, value);

      return record;
    });
  }
}
