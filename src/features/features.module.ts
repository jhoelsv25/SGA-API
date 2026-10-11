import { Module } from "@nestjs/common";
import { AnioEscolarModule } from "./anio-escolar";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { CalendarioModule } from "./calendario";
import { CursosModule } from "./cursos";
import { CargosModule } from "./cargos";
import { EquiposModule } from "./equipos";
import { GradosModule } from "./grados";
import { InstitucionModule } from "./institucion";
import { MenusModule } from "./menus";
import { PersonasModule } from "./personas";
import { DocentesModule } from "./docentes";
import { EstudiantesModule } from "./estudiantes";
import { ApoderadosModule } from "./apoderados";
import { CredencialesModule } from "./credenciales";
import { ImportacionModule } from "./importacion";
import { PlanEstudiosModule } from "./plan-estudios";
import { RolesModule } from "./roles";
import { TurnosModule } from "./turnos";
import { UsersModule } from "./users";
import { VariablesSistemaModule } from "./variables-sistema";
import { SeccionesModule } from "./secciones";
import { CargaAcademicaModule } from "./carga-academica";
import { HorariosModule } from "./horarios";
import { MarcacionesModule } from "./marcaciones";
import { AsistenciaClaseModule } from "./asistencia-clase";

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
    CargosModule,
    PersonasModule,
    DocentesModule,
    EstudiantesModule,
    ApoderadosModule,
    CredencialesModule,
    ImportacionModule,
    SeccionesModule,
    CargaAcademicaModule,
    HorariosModule,
    MarcacionesModule,
    AsistenciaClaseModule,
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
    CargosModule,
    PersonasModule,
    DocentesModule,
    EstudiantesModule,
    ApoderadosModule,
    CredencialesModule,
    ImportacionModule,
    SeccionesModule,
    CargaAcademicaModule,
    HorariosModule,
    MarcacionesModule,
    AsistenciaClaseModule,
  ],
})
export class FeaturesModule {}
