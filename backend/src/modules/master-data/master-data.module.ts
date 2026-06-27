import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { MasterDataController } from "./master-data.controller";
import { MasterDataProjectionService } from "./master-data-projection.service";
import { MasterDataService } from "./master-data.service";

@Module({
  imports: [RealtimeModule],
  controllers: [MasterDataController],
  providers: [MasterDataService, MasterDataProjectionService],
})
export class MasterDataModule {}
