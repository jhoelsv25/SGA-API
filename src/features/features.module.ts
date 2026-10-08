import { Module } from "@nestjs/common";
import { AnioEscolarModule } from "./anio-escolar";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { CalendarioModule } from "./calendario";
import { CursosModule } from "./cursos";
import { EquiposModule } from "./equipos";
import { GradosModule } from "./grados";
import { InstitucionModule } from "./institucion";
import { MenusModule } from "./menus";
import { PlanEstudiosModule } from "./plan-estudios";
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
    CalendarioModule,
    GradosModule,
    CursosModule,
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
    GradosModule,
    CursosModule,
    PlanEstudiosModule,
  ],
})
export class FeaturesModule {}
