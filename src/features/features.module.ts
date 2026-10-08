import { Module } from "@nestjs/common";
import { AnioEscolarModule } from "./anio-escolar";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { EquiposModule } from "./equipos";
import { InstitucionModule } from "./institucion";
import { MenusModule } from "./menus";
import { RolesModule } from "./roles";
import { TurnosModule } from "./turnos";
import { UsersModule } from "./users";
import { VariablesSistemaModule } from "./variables-sistema";

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
    VariablesSistemaModule,
    AnioEscolarModule,
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
    VariablesSistemaModule,
    AnioEscolarModule,
  ],
})
export class FeaturesModule {}
