import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';
import { CsvImporter } from '../infrastructure/csv/csv.importer';
import { CsvConfirmDto } from './dto/csv-upload.dto';
import { CsvFieldMapping } from '../infrastructure/csv/csv.importer';

@ApiTags('source-connector')
@Controller('api/source-connector')
export class CsvController {
  constructor(
    private readonly csvImporter: CsvImporter,
    private readonly queueService: QueueService,
  ) {}

  @Post('import-csv')
  @ApiOperation({ summary: 'Upload CSV and get column headers for mapping' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv|txt)$/i)) {
          return cb(new BadRequestException('Only CSV files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const preview = await this.csvImporter.preview(file.path);
    return {
      filePath: file.path,
      ...preview,
    };
  }

  @Post('import-csv/confirm')
  @ApiOperation({ summary: 'Confirm CSV import with column mapping' })
  async confirmImport(@Body() dto: CsvConfirmDto) {
    const jobId = await this.queueService.addJob(
      QUEUE_NAMES.PRODUCT_INGESTION,
      JobName.IMPORT_CSV,
      { filePath: dto.filePath, mapping: dto.mapping as CsvFieldMapping, source: dto.source },
    );
    return { jobId, status: 'queued' };
  }
}
