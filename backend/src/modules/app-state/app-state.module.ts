import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { AppStateController } from "./app-state.controller";
import { AppStateService } from "./app-state.service";
import { WorkflowProjectionService } from "./workflow-projection.service";

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [AppStateController],
  providers: [AppStateService, WorkflowProjectionService],
})
export class AppStateModule {}
