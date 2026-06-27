import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { ServiceBookingsController } from "./service-bookings.controller";
import { ServiceBookingsService } from "./service-bookings.service";

@Module({
  imports: [RealtimeModule],
  controllers: [ServiceBookingsController],
  providers: [ServiceBookingsService],
})
export class ServiceBookingsModule {}
