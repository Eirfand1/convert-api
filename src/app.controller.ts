import { AppService } from './app.service';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('convert')
export class AppController {

  constructor(private readonly convertService: AppService) { }

  @Post('docx-to-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only DOCX files are allowed'), false);
        }
      },
    }),
  )
  async convertDocxToPdf(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const pdfPath = await this.convertService.convertDocxToPdf(file.path);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.originalname.replace('.docx', '.pdf')}"`,
      );

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);

      fileStream.on('end', async () => {
        await this.convertService.cleanupFile(file.path);
        await this.convertService.cleanupFile(pdfPath);
      });

      fileStream.on('error', async (error) => {
        console.error('Error streaming file:', error);
        await this.convertService.cleanupFile(file.path);
        await this.convertService.cleanupFile(pdfPath);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Error streaming file',
        });
      });

    } catch (error) {
      await this.convertService.cleanupFile(file.path);
      throw error;
    }
  }
}
