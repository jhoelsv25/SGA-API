import { Module } from "@nestjs/common";
import { AnioEscolarModule } from "./anio-escolar";
import { ApoderadosModule } from "./apoderados";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { CalendarioModule } from "./calendario";
import { CargaAcademicaModule } from "./carga-academica";
import { CargosModule } from "./cargos";
import { CredencialesModule } from "./credenciales";
import { CursosModule } from "./cursos";
import { DocentesModule } from "./docentes";
import { EquiposModule } from "./equipos";
import { EstudiantesModule } from "./estudiantes";
import { GradosModule } from "./grados";
import { HorariosModule } from "./horarios";
import { ImportacionModule } from "./importacion";
import { InstitucionModule } from "./institucion";
import { MatriculasModule } from "./matriculas";
import { MenusModule } from "./menus";
import { PersonasModule } from "./personas";
import { PlanEstudiosModule } from "./plan-estudios";
import { RolesModule } from "./roles";
import { SeccionesModule } from "./secciones";
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
    SeccionesModule,
    CargaAcademicaModule,
    HorariosModule,
    MatriculasModule,
    CursosModule,
    PlanEstudiosModule,
    CargosModule,
    PersonasModule,
    DocentesModule,
    EstudiantesModule,
    ApoderadosModule,
    CredencialesModule,
    ImportacionModule,
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
    SeccionesModule,
    CargaAcademicaModule,
    HorariosModule,
    MatriculasModule,
    CursosModule,
    PlanEstudiosModule,
    CargosModule,
    PersonasModule,
    DocentesModule,
    EstudiantesModule,
    ApoderadosModule,
    CredencialesModule,
    ImportacionModule,
  ],
})
export class FeaturesModule {}

