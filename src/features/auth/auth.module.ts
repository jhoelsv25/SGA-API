import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditService } from "../../common/services/audit.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./repositories/auth.repository";
import { SessionService } from "./services/session.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          "JWT_SECRET",
          "sga_super_secret_jwt_key_2026_change_in_prod",
        ),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "1d") as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, AuthRepository, JwtStrategy, AuditService],
  exports: [AuthService, SessionService, AuthRepository, JwtModule, PassportModule],
})
export class AuthModule {}
