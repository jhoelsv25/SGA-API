// La librería "ai" solo se publica como ESM y Jest no la carga. Las pruebas e2e no llaman a la IA.
const iaFalsa: unknown = new Proxy(
  {},
  { get: (_, nombre) => nombre === "__esModule" || (() => ({})) },
);

export = iaFalsa;
