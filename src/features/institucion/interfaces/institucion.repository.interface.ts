import { InstitucionResponseDto, UpdateInstitucionDto } from "../dto";

export interface IInstitucionRepository {
  get(): Promise<InstitucionResponseDto | null>;
  update(dto: UpdateInstitucionDto): Promise<InstitucionResponseDto>;
  updateLogoUrl(logoUrl: string): Promise<InstitucionResponseDto>;
}
