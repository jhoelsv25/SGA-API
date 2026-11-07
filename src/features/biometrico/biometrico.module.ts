import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { BiometricoController } from "./biometrico.controller";
import { BiometricoService } from "./biometrico.service";
import { BiometricoRepository } from "./repositories";

@Module({
  controllers: [BiometricoController],
  providers: [BiometricoService, BiometricoRepository, AuditService],
  exports: [BiometricoService],
})
export class BiometricoModule {}
