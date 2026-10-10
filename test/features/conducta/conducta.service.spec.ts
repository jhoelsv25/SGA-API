import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConductaService } from "@/features/conducta/services/conducta.service";
import { ConductaRepository } from "@/features/conducta/repositories/conducta.repository";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { MENSAJES_CONDUCTA } from "@/features/conducta/constants";
import {
  IncidenciaItem,
  InfoMatriculaEstudiante,
  ObservacionItem,
  UserContext,
} from "@/features/conducta/interfaces";

describe("ConductaService (RF-018: Conducta y Observaciones del Estudiante)", () => {
  let service: ConductaService;
  let repository: jest.Mocked<ConductaRepository>;
  let auditService: jest.Mocked<AuditService>;
  let notificacionesService: jest.Mocked<NotificacionesService>;

  const mockMatriculaInfo: InfoMatriculaEstudiante = {
    matriculaId: "mat-5a-01",
    estudianteId: "est-01",
    estudianteUsuarioId: "usr-est-01",
    nombreCompleto: "Juan Pérez Ramos",
    codigoEstudiante: "2026-0001",
    seccionId: "sec-5a",
    gradoId: "gra-5",
    tutorUsuarioId: "usr-tutor-5a",
    apoderadoPrincipalUsuarioId: "usr-apod-01",
    apoderadoPrincipalNombre: "Carlos Pérez",
  };

  const docenteUser: UserContext = {
    id: "usr-docente-01",
    rol: "docente",
    permisos: ["conducta.registrar", "observaciones.registrar"],
  };

  const tutorUser: UserContext = {
    id: "usr-tutor-5a",
    rol: "docente",
    permisos: ["conducta.registrar", "observaciones.registrar"],
  };

  const directorUser: UserContext = {
    id: "usr-director-01",
    rol: "director",
    permisos: ["conducta.registrar", "observaciones.registrar"],
  };

  const apoderadoUser: UserContext = {
    id: "usr-apod-01",
    rol: "apoderado",
  };

  const estudianteUser: UserContext = {
    id: "usr-est-01",
    rol: "estudiante",
  };

  beforeEach(() => {
    repository = {
      obtenerInfoMatricula: jest.fn(),
      esDocenteDeSeccion: jest.fn(),
      esTutorDeSeccion: jest.fn(),
      esApoderadoDeEstudiante: jest.fn(),
      esEstudianteDeMatricula: jest.fn(),
      deducirPeriodoId: jest.fn(),
      crearIncidencia: jest.fn(),
      obtenerIncidenciaPorId: jest.fn(),
      actualizarIncidencia: jest.fn(),
      eliminarIncidencia: jest.fn(),
      listarIncidencias: jest.fn(),
      crearObservacion: jest.fn(),
      obtenerObservacionPorId: jest.fn(),
      listarObservaciones: jest.fn(),
      obtenerResumenConducta: jest.fn(),
    } as unknown as jest.Mocked<ConductaRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    notificacionesService = {
      enviar: jest.fn().mockResolvedValue({ id: "notif-01" }),
    } as unknown as jest.Mocked<NotificacionesService>;

    service = new ConductaService(repository, auditService, notificacionesService);
  });

  describe("HU1: Registrar incidencias de conducta", () => {
    it("CP-RF018-01: debe registrar una falta leve, notificar al apoderado principal y confirmar", async () => {
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);
      repository.esDocenteDeSeccion.mockResolvedValue(true);
      repository.deducirPeriodoId.mockResolvedValue("per-bim-1");
      repository.crearIncidencia.mockResolvedValue("inc-01");

      const result = await service.registrarIncidencia(
        {
          matriculaId: "mat-5a-01",
          fecha: "2026-05-10",
          tipo: "falta",
          categoria: "Uniforme",
          gravedad: "leve",
          descripcion: "Asistió sin la casaca del uniforme institucional.",
        },
        docenteUser,
      );

      expect(result.id).toBe("inc-01");
      expect(result.message).toBe(MENSAJES_CONDUCTA.INCIDENCIA_REGISTRADA);
      expect(notificacionesService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "usr-apod-01",
          tipo: "alerta",
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tabla: "incidencias_conducta",
          accion: "crear",
        }),
      );
    });

    it("CP-RF018-02: debe registrar un mérito sin gravedad y notificar al apoderado", async () => {
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);
      repository.esDocenteDeSeccion.mockResolvedValue(true);
      repository.deducirPeriodoId.mockResolvedValue("per-bim-1");
      repository.crearIncidencia.mockResolvedValue("inc-02");

      const result = await service.registrarIncidencia(
        {
          matriculaId: "mat-5a-01",
          fecha: "2026-05-10",
          tipo: "merito",
          categoria: "Participación",
          descripcion: "Excelente aporte y liderazgo en la feria de ciencias.",
        },
        docenteUser,
      );

      expect(result.id).toBe("inc-02");
      expect(notificacionesService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "usr-apod-01",
          tipo: "informacion",
        }),
      );
    });

    it("CP-RF018-03: debe rechazar una falta que no especifique gravedad", async () => {
      await expect(
        service.registrarIncidencia(
          {
            matriculaId: "mat-5a-01",
            fecha: "2026-05-10",
            tipo: "falta",
            categoria: "Uniforme",
            descripcion: "Falta sin gravedad",
          },
          docenteUser,
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES_CONDUCTA.FALTA_SIN_GRAVEDAD));
    });

    it("CP-RF018-04: debe rechazar fecha posterior a hoy", async () => {
      const fechaFutura = "2029-12-31";

      await expect(
        service.registrarIncidencia(
          {
            matriculaId: "mat-5a-01",
            fecha: fechaFutura,
            tipo: "falta",
            categoria: "Uniforme",
            gravedad: "leve",
            descripcion: "Fecha futura",
          },
          docenteUser,
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES_CONDUCTA.FECHA_FUTURA));
    });

    it("CP-RF018-05: debe rechazar registro si el estudiante está fuera del alcance de la sección del docente", async () => {
      repository.obtenerInfoMatricula.mockResolvedValue({
        ...mockMatriculaInfo,
        seccionId: "sec-4b",
      });
      repository.esDocenteDeSeccion.mockResolvedValue(false);

      await expect(
        service.registrarIncidencia(
          {
            matriculaId: "mat-4b-01",
            fecha: "2026-05-10",
            tipo: "falta",
            categoria: "Respeto",
            gravedad: "grave",
            descripcion: "No pertenece a mi aula",
          },
          docenteUser,
        ),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONDUCTA.FUERA_DE_ALCANCE));
    });

    it("CP-RF018-06: Director con alcance colegio puede registrar sobre cualquier estudiante", async () => {
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);
      repository.deducirPeriodoId.mockResolvedValue("per-bim-1");
      repository.crearIncidencia.mockResolvedValue("inc-dir-01");

      const result = await service.registrarIncidencia(
        {
          matriculaId: "mat-5a-01",
          fecha: "2026-05-10",
          tipo: "falta",
          categoria: "Disciplina",
          gravedad: "muy_grave",
          descripcion: "Incidencia disciplinaria grave registrada por dirección.",
        },
        directorUser,
      );

      expect(result.id).toBe("inc-dir-01");
      // No debe consultar esDocenteDeSeccion porque es director
      expect(repository.esDocenteDeSeccion).not.toHaveBeenCalled();
    });

    it("CP-RF018-07: debe permitir corregir la incidencia dentro del plazo de 24 horas", async () => {
      const creadoHace3Horas = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const mockIncidencia: IncidenciaItem = {
        id: "inc-01",
        matriculaId: "mat-5a-01",
        periodoId: "per-bim-1",
        registradoPorId: docenteUser.id,
        fecha: "2026-05-10",
        tipo: "falta",
        categoria: "Uniforme",
        gravedad: "leve",
        descripcion: "Descripción inicial",
        apoderadoNotificado: true,
        creadoEn: creadoHace3Horas,
        actualizadoEn: creadoHace3Horas,
      };

      repository.obtenerIncidenciaPorId.mockResolvedValue(mockIncidencia);
      repository.actualizarIncidencia.mockResolvedValue(undefined);

      const result = await service.corregirIncidencia(
        "inc-01",
        { descripcion: "Descripción corregida y aclarada." },
        docenteUser,
      );

      expect(result.message).toBe("Incidencia corregida exitosamente.");
      expect(repository.actualizarIncidencia).toHaveBeenCalledWith("inc-01", {
        descripcion: "Descripción corregida y aclarada.",
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar" }),
      );
    });

    it("CP-RF018-08: debe rechazar la corrección si transcurrieron más de 24 horas", async () => {
      const creadoHace2Dias = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const mockIncidencia: IncidenciaItem = {
        id: "inc-01",
        matriculaId: "mat-5a-01",
        periodoId: "per-bim-1",
        registradoPorId: docenteUser.id,
        fecha: "2026-05-08",
        tipo: "falta",
        categoria: "Uniforme",
        gravedad: "leve",
        descripcion: "Descripción vieja",
        apoderadoNotificado: true,
        creadoEn: creadoHace2Dias,
        actualizadoEn: creadoHace2Dias,
      };

      repository.obtenerIncidenciaPorId.mockResolvedValue(mockIncidencia);

      await expect(
        service.corregirIncidencia(
          "inc-01",
          { descripcion: "Intento corregir 2 días después" },
          docenteUser,
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES_CONDUCTA.CORRECCION_FUERA_DE_PLAZO));
    });

    it("CP-RF018-09: debe exigir motivo para anular una incidencia", async () => {
      await expect(service.anularIncidencia("inc-01", { motivo: "" }, docenteUser)).rejects.toThrow(
        new BadRequestException(MENSAJES_CONDUCTA.ANULACION_SIN_MOTIVO),
      );

      repository.obtenerIncidenciaPorId.mockResolvedValue({
        id: "inc-01",
        matriculaId: "mat-5a-01",
        periodoId: "per-bim-1",
        registradoPorId: docenteUser.id,
        fecha: "2026-05-10",
        tipo: "falta",
        categoria: "Uniforme",
        descripcion: "Test",
        apoderadoNotificado: true,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      });
      repository.eliminarIncidencia.mockResolvedValue(undefined);

      const res = await service.anularIncidencia(
        "inc-01",
        { motivo: "Se registró por error al estudiante equivocado." },
        docenteUser,
      );

      expect(res.message).toBe("Incidencia anulada exitosamente.");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tabla: "incidencias_conducta",
          accion: "eliminar",
        }),
      );
    });
  });

  describe("HU2: Observaciones del estudiante", () => {
    it("CP-RF018-10: Tutor registra observación confidencial derivada a psicología", async () => {
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);
      repository.esDocenteDeSeccion.mockResolvedValue(true);
      repository.crearObservacion.mockResolvedValue("obs-01");

      const result = await service.registrarObservacion(
        {
          matriculaId: "mat-5a-01",
          fecha: "2026-05-10",
          tipo: "familiar",
          observacion: "Situación familiar delicada.",
          derivadoA: "psicología",
          esConfidencial: true,
        },
        tutorUser,
      );

      expect(result.id).toBe("obs-01");
      expect(result.message).toBe("Observación registrada exitosamente.");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tabla: "observaciones_estudiante",
          accion: "crear",
        }),
      );
    });

    it("CP-RF018-11: Docente que no es tutor ni autor no tiene acceso a una observación confidencial", async () => {
      const otroDocente: UserContext = {
        id: "usr-docente-ajeno",
        rol: "docente",
      };

      const mockObs: ObservacionItem = {
        id: "obs-01",
        matriculaId: "mat-5a-01",
        registradoPorId: tutorUser.id,
        fecha: "2026-05-10",
        tipo: "familiar",
        observacion: "Datos sensibles",
        esConfidencial: true,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };

      repository.obtenerObservacionPorId.mockResolvedValue(mockObs);
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);

      await expect(service.obtenerObservacionPorId("obs-01", otroDocente)).rejects.toThrow(
        new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_OBSERVACION),
      );
    });

    it("CP-RF018-12: Docente de la sección puede ver una observación no confidencial", async () => {
      const mockObs: ObservacionItem = {
        id: "obs-02",
        matriculaId: "mat-5a-01",
        registradoPorId: tutorUser.id,
        fecha: "2026-05-10",
        tipo: "academica",
        observacion: "Dificultad en comprensión lectora.",
        esConfidencial: false,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };

      repository.obtenerObservacionPorId.mockResolvedValue(mockObs);
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);
      repository.esDocenteDeSeccion.mockResolvedValue(true);

      const result = await service.obtenerObservacionPorId("obs-02", docenteUser);
      expect(result.id).toBe("obs-02");
    });

    it("CP-RF018-18: Usuario con permiso observaciones.ver_confidenciales (v2.0) puede ver confidencial", async () => {
      const psicologaUser: UserContext = {
        id: "usr-psicologa-01",
        rol: "psicologo",
        permisos: ["observaciones.ver_confidenciales"],
      };

      const mockObs: ObservacionItem = {
        id: "obs-01",
        matriculaId: "mat-5a-01",
        registradoPorId: tutorUser.id,
        fecha: "2026-05-10",
        tipo: "socioemocional",
        observacion: "Seguimiento psicológico especializado.",
        esConfidencial: true,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };

      repository.obtenerObservacionPorId.mockResolvedValue(mockObs);
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);

      const result = await service.obtenerObservacionPorId("obs-01", psicologaUser);
      expect(result.id).toBe("obs-01");
    });
  });

  describe("HU3: Consulta de la familia y el estudiante", () => {
    it("CP-RF018-13: Apoderado consulta incidencias de su hijo", async () => {
      repository.esApoderadoDeEstudiante.mockResolvedValue(true);
      repository.listarIncidencias.mockResolvedValue({
        data: [
          {
            id: "inc-01",
            matriculaId: "mat-5a-01",
            periodoId: "per-bim-1",
            registradoPorId: docenteUser.id,
            fecha: "2026-05-10",
            tipo: "falta",
            categoria: "Uniforme",
            gravedad: "leve",
            descripcion: "Falta de casaca",
            apoderadoNotificado: true,
            creadoEn: new Date().toISOString(),
            actualizadoEn: new Date().toISOString(),
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

      const res = await service.listarIncidencias(
        { matriculaId: "mat-5a-01", limit: 20 },
        apoderadoUser,
      );

      expect(res.data.length).toBe(1);
      expect(res.data[0].descripcion).toBe("Falta de casaca");
    });

    it("CP-RF018-14: Apoderado ve observaciones de su hijo, incluidas confidenciales", async () => {
      repository.esApoderadoDeEstudiante.mockResolvedValue(true);
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);

      const obsConfidencial: ObservacionItem = {
        id: "obs-conf-01",
        matriculaId: "mat-5a-01",
        registradoPorId: tutorUser.id,
        fecha: "2026-05-10",
        tipo: "familiar",
        observacion: "Nota para padres",
        esConfidencial: true,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };

      repository.listarObservaciones.mockResolvedValue({
        data: [obsConfidencial],
        nextCursor: null,
        hasMore: false,
      });

      const res = await service.listarObservaciones(
        { matriculaId: "mat-5a-01", limit: 20 },
        apoderadoUser,
      );

      expect(res.data.length).toBe(1);
      expect(res.data[0].esConfidencial).toBe(true);
    });

    it("CP-RF018-15: Apoderado intenta ver incidencias de un estudiante que no es su hijo", async () => {
      repository.esApoderadoDeEstudiante.mockResolvedValue(false);

      await expect(
        service.listarIncidencias({ matriculaId: "mat-ajena-01" }, apoderadoUser),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE));
    });

    it("CP-RF018-16: Estudiante consulta su conducta y observaciones (incluidas confidenciales, v2.0)", async () => {
      repository.esEstudianteDeMatricula.mockResolvedValue(true);
      repository.obtenerInfoMatricula.mockResolvedValue(mockMatriculaInfo);

      const obsConfidencial: ObservacionItem = {
        id: "obs-conf-01",
        matriculaId: "mat-5a-01",
        registradoPorId: tutorUser.id,
        fecha: "2026-05-10",
        tipo: "conductual",
        observacion: "Compromiso de conducta del estudiante",
        esConfidencial: true,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };

      repository.listarObservaciones.mockResolvedValue({
        data: [obsConfidencial],
        nextCursor: null,
        hasMore: false,
      });

      const res = await service.listarObservaciones(
        { matriculaId: "mat-5a-01", limit: 20 },
        estudianteUser,
      );

      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe("obs-conf-01");
    });

    it("CP-RF018-17: Consulta de resumen cuantitativo en la ficha del estudiante", async () => {
      repository.obtenerResumenConducta.mockResolvedValue({
        matriculaId: "mat-5a-01",
        estudianteNombre: "Juan Pérez Ramos",
        codigoEstudiante: "2026-0001",
        gradoNombre: "5.° Grado",
        seccionNombre: "A",
        totalMeritos: 4,
        totalFaltas: 2,
        desglosePorBimestre: [
          {
            periodoId: "per-01",
            periodoNombre: "Primer Bimestre",
            numeroPeriodo: 1,
            meritos: 3,
            faltasLeves: 1,
            faltasGraves: 0,
            faltasMuyGraves: 0,
            totalFaltas: 1,
          },
          {
            periodoId: "per-02",
            periodoNombre: "Segundo Bimestre",
            numeroPeriodo: 2,
            meritos: 1,
            faltasLeves: 0,
            faltasGraves: 1,
            faltasMuyGraves: 0,
            totalFaltas: 1,
          },
        ],
      });

      const resumen = await service.obtenerResumenConducta("mat-5a-01", tutorUser);

      expect(resumen.totalMeritos).toBe(4);
      expect(resumen.totalFaltas).toBe(2);
      expect(resumen.desglosePorBimestre.length).toBe(2);
      expect(resumen.desglosePorBimestre[0].meritos).toBe(3);
    });
  });
});
