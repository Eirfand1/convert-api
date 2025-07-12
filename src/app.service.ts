import { Injectable, BadRequestException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class AppService {
  async convertDocxToPdf(filePath: string): Promise<string> {
    try {
      const fileName = path.basename(filePath, '.docx');
      const outputDir = path.dirname(filePath);
      const outputPath = path.join(outputDir, `${fileName}.pdf`);

      const command = `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${filePath}"`;

      await execAsync(command);

      if (!fs.existsSync(outputPath)) {
        throw new BadRequestException('Failed to convert DOCX to PDF');
      }

      return outputPath;
    } catch (error) {
      throw new BadRequestException(`Conversion failed: ${error.message}`);
    }
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}
