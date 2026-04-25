import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import { ScrapedProduct } from '../../domain/adapters/source.adapter.interface';

// Handles Vietnamese number formats: "7,8k" → 7800, "₫7.020" → 7020, "90%" → 90
// Also handles standard decimals: "99.9" → 99.9
function parseVietnameseNumber(value: string): number {
  const noSymbols = value.replace(/[₫đ%\s]/g, '');
  // If comma exists, treat as Vietnamese decimal: replace , with ., remove all .
  // If no comma, keep . as decimal (standard format: 99.9 → 99.9)
  const cleaned = noSymbols.includes(',')
    ? noSymbols.replace(/\./g, '').replace(',', '.')
    : noSymbols.replace(/(\.\d{3})/g, ''); // Only remove . if it's a thousands separator (exactly 3 digits after)
  const multiplier = /k$/i.test(cleaned) ? 1000 : 1;
  return parseFloat(cleaned.replace(/k$/i, '')) * multiplier;
}

// Maps CSV header → ScrapedProduct field name
export type CsvFieldMapping = Record<string, keyof ScrapedProduct>;

@Injectable()
export class CsvImporter {
  private readonly logger = new Logger(CsvImporter.name);

  async preview(filePath: string): Promise<{ headers: string[]; rows: string[][] }> {
    const records = await this.readRecords(filePath, 6);
    if (records.length === 0) return { headers: [], rows: [] };

    const headers = records[0] as string[];
    const rows = (records.slice(1, 6) as string[][]);
    return { headers, rows };
  }

  async parse(filePath: string, mapping: CsvFieldMapping, source: string): Promise<ScrapedProduct[]> {
    const records = await this.readRecords(filePath);
    if (records.length < 2) return [];

    const headers = records[0] as string[];
    const products: ScrapedProduct[] = [];

    for (const row of records.slice(1) as string[][]) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => (rowObj[h] = row[i] ?? ''));

      const product = this.mapRow(rowObj, mapping, source);
      if (product) products.push(product);
    }

    this.logger.log(`CSV parsed: ${products.length} valid products from ${records.length - 1} rows`);
    return products;
  }

  private mapRow(
    row: Record<string, string>,
    mapping: CsvFieldMapping,
    source: string,
  ): ScrapedProduct | null {
    const result: Partial<ScrapedProduct> = { source, rawData: row };

    for (const [csvHeader, field] of Object.entries(mapping)) {
      const value = row[csvHeader];
      if (!value) continue;

      if (field === 'price' || field === 'commission') {
        const num = parseVietnameseNumber(value);
        if (!isNaN(num)) result[field] = num;
      } else if (field !== 'rawData' && field !== 'source') {
        (result as Record<string, unknown>)[field] = value;
      }
    }

    if (!result.externalId || !result.name) {
      this.logger.warn(`Skipping row: missing externalId or name after mapping`);
      return null;
    }

    return result as ScrapedProduct;
  }

  private readRecords(filePath: string, maxRows?: number): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const records: unknown[] = [];
      const stream = fs.createReadStream(filePath);
      const parser = parse({ relax_quotes: true, skip_empty_lines: true });

      stream.on('error', reject);
      parser.on('error', reject);
      parser.on('end', () => resolve(records));

      parser.on('readable', () => {
        let record: unknown;
        while ((record = parser.read()) !== null) {
          records.push(record);
          if (maxRows && records.length >= maxRows) {
            stream.unpipe(parser);
            stream.destroy();
            resolve(records);
            return;
          }
        }
      });

      stream.pipe(parser);
    });
  }
}
