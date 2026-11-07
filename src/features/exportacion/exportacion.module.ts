import { Module } from "@nestjs/common";
import { ApoderadosModule } from "../apoderados/apoderados.module";
import { DocentesModule } from "../docentes/docentes.module";
import { EstudiantesModule } from "../estudiantes/estudiantes.module";
import { InstitucionModule } from "../institucion/institucion.module";
import { PersonasModule } from "../personas/personas.module";
import { UsersModule } from "../users/users.module";
import { ExportacionController } from "./exportacion.controller";
import { ExportacionService } from "./exportacion.service";

@Module({
  imports: [
    PersonasModule,
    EstudiantesModule,
    DocentesModule,
    ApoderadosModule,
    UsersModule,
    InstitucionModule,
  ],
  controllers: [ExportacionController],
  providers: [ExportacionService],
})
export class ExportacionModule {}
