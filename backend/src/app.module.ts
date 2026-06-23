import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppStateModule } from "./modules/app-state/app-state.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { HealthModule } from "./modules/health/health.module";
import { MasterDataModule } from "./modules/master-data/master-data.module";
import { NormalizedDataModule } from "./modules/normalized-data/normalized-data.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ServiceBookingsModule } from "./modules/service-bookings/service-bookings.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AppStateModule,
    HealthModule,
    MasterDataModule,
    NormalizedDataModule,
    AuthModule,
    CustomersModule,
    BookingsModule,
    ServiceBookingsModule,
    ReportsModule,
    UsersModule,
  ],
})
export class AppModule {}
