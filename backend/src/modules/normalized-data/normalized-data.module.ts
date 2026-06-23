import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BanquetKitchenDataController } from "./banquet-kitchen-data.controller";
import { FinanceDataController } from "./finance-data.controller";
import { NormalizedDataService } from "./normalized-data.service";
import { SetupDataController } from "./setup-data.controller";

@Module({
  imports: [PrismaModule],
  controllers: [BanquetKitchenDataController, FinanceDataController, SetupDataController],
  providers: [NormalizedDataService],
})
export class NormalizedDataModule {}
