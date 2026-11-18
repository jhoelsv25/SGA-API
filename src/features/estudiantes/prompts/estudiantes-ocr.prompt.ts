export const INSTRUCCION_OCR_DOCUMENTO_ESTUDIANTE =
  "Analiza la imagen o documento oficial del estudiante (DNI, partida o ficha de matrícula) y devuelve un JSON válido con las claves exactas: dni (string|null), apellidoPaterno (string|null), apellidoMaterno (string|null), nombres (string|null), fechaNacimiento (string AAAA-MM-DD|null), sexo ('M'|'F'|null). Si un dato no es legible, usa null.";
