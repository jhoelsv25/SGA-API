import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { ERROR_MESSAGES } from "./constants";
import { UpdateVariableDto, VariableSistemaResponseDto } from "./dto";
import { VariablesSistemaRepository } from "./repositories";

@Injectable()
export class VariablesSistemaService {
  constructor(
    private readonly repository: VariablesSistemaRepository,
    private readonly auditService: AuditService,
  ) {}

  async listVigentes(modulo?: string): Promise<VariableSistemaResponseDto[]> {
    return this.repository.findVigentes(modulo);
  }

  async getByCodigo(codigo: string): Promise<VariableSistemaResponseDto> {
    const variable = await this.repository.findByCodigoVigente(codigo);
    if (!variable) {
      throw new NotFoundException(ERROR_MESSAGES.VARIABLE_NO_ENCONTRADA);
    }
    return variable;
  }

  async getHistorial(codigo: string): Promise<VariableSistemaResponseDto[]> {
    const variable = await this.repository.findByCodigoVigente(codigo);
    if (!variable) {
      throw new NotFoundException(ERROR_MESSAGES.VARIABLE_NO_ENCONTRADA);
    }
    return this.repository.findHistorialByCodigo(codigo);
  }

  async update(
    codigo: string,
    dto: UpdateVariableDto,
    actorId: string,
    ip?: string,
  ): Promise<VariableSistemaResponseDto> {
    const current = await this.repository.findByCodigoVigente(codigo);
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGES.VARIABLE_NO_ENCONTRADA);
    }

    if (!current.editable) {
      throw new BadRequestException(ERROR_MESSAGES.VARIABLE_NO_EDITABLE);
    }

    const motivo = dto.motivoCambio?.trim();
    if (!motivo) {
      throw new BadRequestException(ERROR_MESSAGES.MOTIVO_REQUERIDO);
    }

    const valorRaw = dto.valor?.trim();
    if (valorRaw === undefined || valorRaw === null || valorRaw === "") {
      throw new BadRequestException("El valor es obligatorio.");
    }

    // Validar tipo de dato
    this.validarTipo(current.tipo, valorRaw);

    // Validar rangos numéricos si aplican
    if (current.tipo === "entero" || current.tipo === "decimal") {
      const numValor = Number(valorRaw);
      this.validarRango(current.valorMinimo, current.valorMaximo, numValor);
    }

    // Validar regla especial de pesos de notas (CP-RF004-30)
    if (codigo.startsWith("nota.peso_")) {
      await this.validarPesosNota(codigo, Number(valorRaw));
    }

    // Versionar e insertar registro nuevo
    const created = await this.repository.crearNuevaVersion({
      variableActualId: current.id,
      codigo: current.codigo,
      descripcion: current.descripcion,
      modulo: current.modulo,
      tipo: current.tipo,
      valor: valorRaw,
      unidad: current.unidad,
      valorMinimo: current.valorMinimo,
      valorMaximo: current.valorMaximo,
      editable: current.editable,
      cargaEnAplicacion: current.cargaEnAplicacion,
      motivoCambio: motivo,
      actualizadoPorId: actorId,
    });

    // Registrar en bitácora de auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "variables_sistema",
      registroId: String(created.id),
      valorAnterior: {
        codigo: current.codigo,
        valor: current.valor,
      },
      valorNuevo: {
        codigo: created.codigo,
        valor: created.valor,
        motivo: created.motivoCambio,
      },
      direccionIp: ip,
    });

    return created;
  }

  private validarTipo(tipo: string, valor: string): void {
    if (tipo === "entero") {
      // Debe ser un número entero válido (sin puntos, comas ni letras)
      if (!/^-?\d+$/.test(valor)) {
        throw new BadRequestException(ERROR_MESSAGES.NUMERO_ENTERO);
      }
    } else if (tipo === "decimal") {
      if (isNaN(Number(valor)) || isNaN(parseFloat(valor))) {
        throw new BadRequestException(ERROR_MESSAGES.NUMERO_DECIMAL);
      }
    } else if (tipo === "booleano") {
      const normalizado = valor.toLowerCase();
      if (!["true", "false", "1", "0"].includes(normalizado)) {
        throw new BadRequestException(ERROR_MESSAGES.BOOLEANO_INVALIDO);
      }
    }
  }

  private validarRango(min: number | null, max: number | null, valor: number): void {
    if (min !== null && valor < min) {
      if (min === 0 && max === 60) {
        throw new BadRequestException(ERROR_MESSAGES.VALOR_RANGO_0_60);
      }
      throw new BadRequestException(`El valor debe estar entre ${min} y ${max ?? "sin límite"}.`);
    }

    if (max !== null && valor > max) {
      if (min === 0 && max === 60) {
        throw new BadRequestException(ERROR_MESSAGES.VALOR_RANGO_0_60);
      }
      throw new BadRequestException(`El valor debe estar entre ${min ?? 0} y ${max}.`);
    }
  }

  private async validarPesosNota(codigoActual: string, nuevoPeso: number): Promise<void> {
    const pesosVigentes = await this.repository.findPesosNotaVigentes();
    let suma = nuevoPeso;

    for (const p of pesosVigentes) {
      if (p.codigo !== codigoActual) {
        suma += Number(p.valor);
      }
    }

    // Tolerancia por precisión de flotantes (100 %)
    if (Math.abs(suma - 100) > 0.001) {
      throw new BadRequestException(ERROR_MESSAGES.PESOS_SUMA_100);
    }
  }
}
