INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'marcacion.segundos_doble_lectura_kiosko', 'Segundos en los que otra marca del personal en el kiosko se toma como la misma lectura (doble toque o carné leído dos veces) y no como salida. 0 lo desactiva', 'asistencia', 'entero', '60', 'segundos', 0, 600
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'marcacion.segundos_doble_lectura_kiosko');
