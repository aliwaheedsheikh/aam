import { Module } from "@nestjs/common";
import { MasterDataController } from "./master-data.controller";
import { MasterDataProjectionService } from "./master-data-projection.service";
import { MasterDataService } from "./master-data.service";

@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService, MasterDataProjectionService],
})
export class MasterDataModule {}
