import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppStateModule } from "./modules/app-state/app-state.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { HealthModule } from "./modules/health/health.module";
import { MasterDataModule } from "./modules/master-data/master-data.module";
import { NormalizedDataModule } from "./modules/normalized-data/normalized-data.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { ServiceBookingsModule } from "./modules/service-bookings/service-bookings.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    // S-2: Global rate limiting — max 60 requests per minute per IP by default.
    // The login endpoint overrides this to 5 attempts per minute.
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AppStateModule,
    HealthModule,
    MasterDataModule,
    NormalizedDataModule,
    RealtimeModule,
    AuthModule,
    CustomersModule,
    BookingsModule,
    ServiceBookingsModule,
    ReportsModule,
    UsersModule,
  ],
  providers: [
    // S-2: Apply ThrottlerGuard globally — individual routes can override with @SkipThrottle or @Throttle.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
