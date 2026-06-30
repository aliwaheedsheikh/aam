import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { Server as HttpServer } from "http";
import { AppModule } from "./app.module";
import { RealtimeService } from "./modules/realtime/realtime.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>("API_PREFIX", "api");
  const corsOrigin = configService.get<string>(
    "CORS_ORIGIN",
    "http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173",
  );
  const port = configService.get<number>("PORT", 3001);
  const host = configService.get<string>("HOST", "0.0.0.0");

  // S-3: Only explicit origins from CORS_ORIGIN env var are allowed.
  // The broad RFC-1918 wildcard regex has been removed — it opened any private-
  // network host to credentialed CORS requests, which is unsafe in cloud VPCs.
  const allowedOrigins = corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });

  // S-1: Register cookie-parser so Passport/JWT strategy can read the HttpOnly cookie.
  app.use(cookieParser());

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.get(RealtimeService).attachServer(app.getHttpServer() as HttpServer);

  await app.listen(port, host);
  console.log(`VenueOps backend listening on http://${host}:${port}/${apiPrefix}`);
}

bootstrap();
