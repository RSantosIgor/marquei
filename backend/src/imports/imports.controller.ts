import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ImportsService } from './imports.service';
import { QueryImportJobsDto } from './dto';

@Controller('imports')
@Roles(Role.MANAGER)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const extOk =
          file.originalname.endsWith('.csv') ||
          file.originalname.endsWith('.xlsx');
        if (allowed.includes(file.mimetype) || extOk) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Apenas arquivos CSV ou XLSX são permitidos'), false);
        }
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    return this.importsService.upload(file);
  }

  @Get()
  async findAll(@Query() query: QueryImportJobsDto) {
    return this.importsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.importsService.findOne(id);
  }
}
