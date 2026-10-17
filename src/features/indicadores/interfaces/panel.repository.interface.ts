export interface IPanelRepository {
  contarEstudiantesMatriculadosActivos(anioAcademicoId: string): Promise<number>;
  contarEstudiantesConMarcacionIngresoHoy(fechaHoy: string): Promise<number>;
  contarTardanzasHoy(fechaHoy: string): Promise<number>;
  contarSesionesHoyPorEstado(fechaHoy: string): Promise<{
    cumplidas: number;
    enCurso: number;
    pendientes: number;
    noCumplidas: number;
    justificadas: number;
  }>;
  contarLibretasPendientes(
    anioAcademicoId: string,
    fechaHoy: string,
  ): Promise<{
    vencidas: number;
    porVencer: number;
  }>;
}
