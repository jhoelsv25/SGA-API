import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getJwtSecret } from "./utils/jwt-secret.util";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditService } from "../../common/services/audit.service";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./repositories/auth.repository";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AuthPasswordService, SessionService } from "./services";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    VariablesSistemaModule,
    NotificacionesModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "1d") as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    AuthPasswordService,
    AuthRepository,
    JwtStrategy,
    AuditService,
  ],
  exports: [
    AuthService,
    SessionService,
    AuthPasswordService,
    AuthRepository,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
