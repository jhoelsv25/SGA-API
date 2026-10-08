import { Module } from "@nestjs/common";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { EquiposModule } from "./equipos";
import { InstitucionModule } from "./institucion";
import { MenusModule } from "./menus";
import { RolesModule } from "./roles";
import { TurnosModule } from "./turnos";
import { UsersModule } from "./users";

@Module({
  imports: [
    AuthModule,
    RolesModule,
    UsersModule,
    MenusModule,
    AuditModule,
    InstitucionModule,
    TurnosModule,
    EquiposModule,
  ],
  exports: [
    AuthModule,
    RolesModule,
    UsersModule,
    MenusModule,
    AuditModule,
    InstitucionModule,
    TurnosModule,
    EquiposModule,
  ],
})
export class FeaturesModule {}
