import { Module } from "@nestjs/common";
import { AnioEscolarModule } from "./anio-escolar";
import { CalendarioModule } from "./calendario";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { EquiposModule } from "./equipos";
import { InstitucionModule } from "./institucion";
import { MenusModule } from "./menus";
import { RolesModule } from "./roles";
import { TurnosModule } from "./turnos";
import { UsersModule } from "./users";
import { VariablesSistemaModule } from "./variables-sistema";
import { PlanEstudiosModule } from "./plan-estudios";

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
    CalendarioModule,
    PlanEstudiosModule,
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
    CalendarioModule,
    PlanEstudiosModule,
  ],
})
export class FeaturesModule {}
