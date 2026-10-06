import * as crypto from "crypto";

/**
 * Genera una contraseña temporal segura que cumple con la política de seguridad:
 * Al menos 10 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales.
 */
export function generateTemporaryPassword(length = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%&*";

  // Asegurar al menos uno de cada grupo requerido
  const password = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const allChars = upper + lower + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Mezclar los caracteres de forma segura
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = password[i];
    password[i] = password[j];
    password[j] = temp;
  }

  return password.join("");
}
