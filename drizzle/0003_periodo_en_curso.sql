CREATE UNIQUE INDEX "ux_periodos_academicos_en_curso" ON "periodos_academicos" USING btree ("anio_academico_id") WHERE ((estado)::text = 'en_curso'::text);
