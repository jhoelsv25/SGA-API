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
import { BiometricoModule } from "./biometrico";
import { EquiposModule } from "./equipos";
import { EquiposAccesoModule } from "./equipos-acceso";
import { EstudiantesModule } from "./estudiantes";
import { ExportacionModule } from "./exportacion";
import { GradosModule } from "./grados";
import { HorariosModule } from "./horarios";
import { ImportacionModule } from "./importacion";
import { InstitucionModule } from "./institucion";
import { MatriculasModule } from "./matriculas";
import { MenusModule } from "./menus";
import { NotificacionesModule } from "./notificaciones";
import { ComunicadosModule } from "./comunicados";
import { ConductaModule } from "./conducta";
import { PersonasModule } from "./personas";

import { PlanEstudiosModule } from "./plan-estudios";
import { RolesModule } from "./roles";
import { SeccionesModule } from "./secciones";
import { TurnosModule } from "./turnos";
import { UsersModule } from "./users";
import { VariablesSistemaModule } from "./variables-sistema";
import { MarcacionesModule } from "./marcaciones";
import { AsistenciaClaseModule } from "./asistencia-clase";
import { SesionesClaseModule } from "./sesiones-clase";
import { AusenciasDocenteModule } from "./ausencias-docente";
import { AulaVirtualModule } from "./aula-virtual";
import { LibretasModule } from "./libretas";
import { ConsolidadoDocenteModule } from "./consolidado-docente";
import { IndicadoresModule } from "./indicadores";
import { DashboardModule } from "./dashboard";
import { ObservacionesAulaModule } from "./observaciones-aula";
import { PlanificacionSesionesModule } from "./planificacion-sesiones";

@Module({
  imports: [
    AuthModule,
    RolesModule,
    UsersModule,
    MenusModule,
    AuditModule,
    InstitucionModule,
    TurnosModule,
    BiometricoModule,
    EquiposModule,
    EquiposAccesoModule,
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
    ExportacionModule,
    NotificacionesModule,
    ComunicadosModule,
    MarcacionesModule,
    AsistenciaClaseModule,
    SesionesClaseModule,
    AusenciasDocenteModule,
    AulaVirtualModule,
    ConductaModule,
    LibretasModule,
    ConsolidadoDocenteModule,
    ObservacionesAulaModule,
    PlanificacionSesionesModule,
    IndicadoresModule,
    DashboardModule,
  ],
  exports: [
    AuthModule,
    RolesModule,
    UsersModule,
    MenusModule,
    AuditModule,
    InstitucionModule,
    TurnosModule,
    BiometricoModule,
    EquiposModule,
    EquiposAccesoModule,
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
    NotificacionesModule,
    ComunicadosModule,
    MarcacionesModule,
    AsistenciaClaseModule,
    SesionesClaseModule,
    AusenciasDocenteModule,
    AulaVirtualModule,
    ConductaModule,
    LibretasModule,
    ConsolidadoDocenteModule,
    IndicadoresModule,
    DashboardModule,
  ],
})
export class FeaturesModule {}
