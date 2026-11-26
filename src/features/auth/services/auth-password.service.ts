import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../../../common/services/audit.service";
import { VariablesSistemaRepository } from "../../variables-sistema/repositories";
import {
  DEFAULT_INTENTOS_BLOQUEO,
  DEFAULT_LONGITUD_CONTRASENA,
  PASSWORD_LETRAS_Y_NUMEROS,
  VAR_INTENTOS_BLOQUEO,
  VAR_LONGITUD_CONTRASENA,
} from "../constants";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import type { UsuarioRecord } from "../interfaces/auth-repository.interface";
import { AuthRepository } from "../repositories/auth.repository";
import { SessionService } from "./session.service";

@Injectable()
export class AuthPasswordService {
  private readonly logger = new Logger(AuthPasswordService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly variablesRepository?: VariablesSistemaRepository,
  ) {}

  async verifyPassword(plainPassword: string, user: UsuarioRecord): Promise<void> {
    let isValid = false;
    try {
      isValid = await bcrypt.compare(plainPassword, user.contrasenaHash);
    } catch (error) {
      this.logger.error(`Error al comparar hash con bcrypt: ${(error as Error).message}`);
      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }

    if (!isValid) {
      const maxIntentos = await this.leerVariableNumerica(
        VAR_INTENTOS_BLOQUEO,
        DEFAULT_INTENTOS_BLOQUEO,
      );
      const attempts = user.intentosFallidos + 1;
      const mustLock = attempts >= maxIntentos;

      try {
        await this.authRepository.updateLoginAttempts(user.id, attempts, mustLock);
      } catch (error) {
        this.logger.error(`Error actualizando intentos fallidos: ${(error as Error).message}`);
      }

      if (mustLock) {
        this.logger.warn(
          `Usuario ${user.nombreUsuario} bloqueado tras ${maxIntentos} intentos fallidos`,
        );

        await this.auditService?.log({
          usuarioId: null, // Sistema
          accion: "actualizar",
          tabla: "usuarios",
          registroId: user.id,
          valorAnterior: { estado: user.estado, intentosFallidos: user.intentosFallidos },
          valorNuevo: { estado: "bloqueado", intentosFallidos: attempts },
        });

        throw new UnauthorizedException(
          "Tu cuenta ha sido bloqueada por superar el límite de intentos fallidos.",
        );
      }

      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentToken?: string,
  ): Promise<{ message: string }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    this.assertUserIsActive(user);

    // 1. Validar que la contraseña actual sea correcta
    let isCurrentValid = false;
    try {
      isCurrentValid = await bcrypt.compare(dto.currentPassword, user.contrasenaHash);
    } catch (error) {
      this.logger.error(`Error comparando contraseña actual: ${(error as Error).message}`);
    }

    if (!isCurrentValid) {
      throw new BadRequestException("Usuario o contraseña incorrectos.");
    }

    // 2. Validar la política de contraseña (longitud configurable, letras y números)
    const longitudMinima = await this.leerVariableNumerica(
      VAR_LONGITUD_CONTRASENA,
      DEFAULT_LONGITUD_CONTRASENA,
    );
    if (
      dto.newPassword.length < longitudMinima ||
      !PASSWORD_LETRAS_Y_NUMEROS.test(dto.newPassword)
    ) {
      throw new BadRequestException(
        `La contraseña debe tener al menos ${longitudMinima} caracteres, con letras y números.`,
      );
    }

    // 3. Validar que la nueva contraseña sea distinta de la actual
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("La nueva contraseña debe ser distinta de la actual.");
    }

    // 4. Generar hash seguro de la nueva contraseña
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // 5. Actualizar contraseña y desmarcar cambio obligatorio
    await this.authRepository.updatePassword(user.id, newHash);

    // 6. Cerrar las demás sesiones abiertas del usuario
    if (currentToken) {
      await this.sessionService.revokeOtherSessions(user.id, currentToken);
    }

    await this.auditService?.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: user.id,
      valorAnterior: { contrasenaCambiada: false },
      valorNuevo: { contrasenaCambiada: true, debeCambiarContrasena: false },
    });

    return {
      message: "Contraseña actualizada exitosamente.",
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedUsername = dto.username.trim().toLowerCase();
    const userWithPersona =
      await this.authRepository.findUserWithPersonaByUsername(normalizedUsername);

    const identidadNoVerificada = new BadRequestException(
      "No se pudo verificar la identidad. Revisa el usuario y la fecha de nacimiento.",
    );

    if (!userWithPersona || userWithPersona.fechaNacimiento !== dto.birthdate) {
      throw identidadNoVerificada;
    }

    return {
      message:
        "Tu identidad ha sido verificada. Comunícate con la administración académica para obtener tu clave de restablecimiento.",
    };
  }

  async leerVariableNumerica(codigo: string, porDefecto: number): Promise<number> {
    try {
      const variable = await this.variablesRepository?.findByCodigoVigente(codigo);
      const valor = Number(variable?.valor);
      return variable && Number.isFinite(valor) ? valor : porDefecto;
    } catch (error) {
      this.logger.warn(`No se pudo leer la variable ${codigo}: ${(error as Error).message}`);
      return porDefecto;
    }
  }

  private assertUserIsActive(user: UsuarioRecord): void {
    if (user.estado === "bloqueado") {
      throw new UnauthorizedException(
        "Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Contacta al administrador.",
      );
    }
    if (user.estado !== "activo") {
      throw new UnauthorizedException("Tu cuenta se encuentra inactiva");
    }
  }
}
