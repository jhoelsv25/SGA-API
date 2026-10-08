import { Module } from "@nestjs/common";
import { AnioEscolarModule } from "./anio-escolar";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { CargosModule } from "./cargos";
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
    CargosModule,
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
    CargosModule,
  ],
})
export class FeaturesModule {}
