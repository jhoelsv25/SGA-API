import { Global, Module } from "@nestjs/common";
import { ESTRATEGIAS_OCR } from "./constants";
import { OcrService } from "./ocr.service";
import { EstrategiaOcrGlm, EstrategiaOcrMistral } from "./strategies";

@Global()
@Module({
  providers: [
    EstrategiaOcrMistral,
    EstrategiaOcrGlm,
    {
      provide: ESTRATEGIAS_OCR,
      inject: [EstrategiaOcrMistral, EstrategiaOcrGlm],
      useFactory: (mistral: EstrategiaOcrMistral, glm: EstrategiaOcrGlm) => [mistral, glm],
    },
    OcrService,
  ],
  exports: [OcrService, ESTRATEGIAS_OCR],
})
export class OcrModule {}
