import { Global, Module } from "@nestjs/common";
import { PROVEEDOR_IA } from "./constants";
import { IaService } from "./ia.service";
import { ProveedorVercelGateway } from "./providers";

@Global()
@Module({
  providers: [
    ProveedorVercelGateway,
    {
      provide: PROVEEDOR_IA,
      useExisting: ProveedorVercelGateway,
    },
    IaService,
  ],
  exports: [IaService, PROVEEDOR_IA],
})
export class IaModule {}
