import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CsvImporter } from '../infrastructure/csv/csv.importer';

function writeTempCsv(content: string): string {
  const file = path.join(os.tmpdir(), `test-${Date.now()}.csv`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

describe('CsvImporter', () => {
  let importer: CsvImporter;

  beforeEach(() => {
    importer = new CsvImporter();
  });

  describe('preview()', () => {
    it('should return headers and up to 5 data rows', async () => {
      const csv = [
        'id,name,price',
        '1,Product A,10',
        '2,Product B,20',
        '3,Product C,30',
        '4,Product D,40',
        '5,Product E,50',
        '6,Product F,60',
      ].join('\n');
      const file = writeTempCsv(csv);

      const result = await importer.preview(file);

      expect(result.headers).toEqual(['id', 'name', 'price']);
      expect(result.rows).toHaveLength(5);
      expect(result.rows[0]).toEqual(['1', 'Product A', '10']);
      expect(result.rows[4]).toEqual(['5', 'Product E', '50']);
      // Row 6 should not be included
      expect(result.rows.find((r) => r[0] === '6')).toBeUndefined();

      fs.unlinkSync(file);
    });

    it('should resolve without hanging when file has fewer rows than maxRows (regression: stream not closed)', async () => {
      // Regression test: readRecords used to call parser.end() inside a readable event
      // while the stream was still piped, causing the Promise to never resolve.
      const csv = ['id,name', '1,Only Row'].join('\n');
      const file = writeTempCsv(csv);

      await expect(
        Promise.race([
          importer.preview(file),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('preview() timed out — stream hung')), 3000),
          ),
        ]),
      ).resolves.toBeDefined();

      fs.unlinkSync(file);
    });

    it('should resolve without hanging when maxRows is hit mid-stream (regression: stream not closed)', async () => {
      // Regression test: when maxRows (6) rows were read, the stream was not unpipe/destroyed,
      // so parser "end" event never fired and the Promise hung indefinitely.
      const rows = Array.from({ length: 50 }, (_, i) => `${i + 1},Product ${i + 1},${i * 10}`);
      const csv = ['id,name,price', ...rows].join('\n');
      const file = writeTempCsv(csv);

      await expect(
        Promise.race([
          importer.preview(file),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('preview() timed out — stream hung after maxRows')), 3000),
          ),
        ]),
      ).resolves.toMatchObject({ headers: ['id', 'name', 'price'], rows: expect.any(Array) });

      fs.unlinkSync(file);
    });

    it('should return empty headers and rows for empty file', async () => {
      const file = writeTempCsv('');

      const result = await importer.preview(file);

      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);

      fs.unlinkSync(file);
    });

    it('should return headers only when file has no data rows', async () => {
      const file = writeTempCsv('id,name,price\n');

      const result = await importer.preview(file);

      expect(result.headers).toEqual(['id', 'name', 'price']);
      expect(result.rows).toHaveLength(0);

      fs.unlinkSync(file);
    });

    it('should handle quoted fields with commas', async () => {
      const csv = 'id,name,price\n1,"Product, with comma",10\n';
      const file = writeTempCsv(csv);

      const result = await importer.preview(file);

      expect(result.rows[0][1]).toBe('Product, with comma');

      fs.unlinkSync(file);
    });
  });

  describe('parse()', () => {
    it('should map CSV columns to ScrapedProduct fields', async () => {
      const csv = ['sku,title,desc', 'abc123,Test Product,A great item'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(
        file,
        { sku: 'externalId', title: 'name', desc: 'description' },
        'shopee',
      );

      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        externalId: 'abc123',
        name: 'Test Product',
        description: 'A great item',
        source: 'shopee',
      });

      fs.unlinkSync(file);
    });

    it('should skip rows missing externalId after mapping', async () => {
      const csv = ['id,name', ',No ID Product'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(file, { id: 'externalId', name: 'name' }, 'shopee');

      expect(products).toHaveLength(0);

      fs.unlinkSync(file);
    });

    it('should skip rows missing name after mapping', async () => {
      const csv = ['id,name', 'abc123,'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(file, { id: 'externalId', name: 'name' }, 'shopee');

      expect(products).toHaveLength(0);

      fs.unlinkSync(file);
    });

    it('should parse numeric price and commission fields', async () => {
      const csv = ['id,name,price,commission', 'abc,Product,99.9,15.5'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(
        file,
        { id: 'externalId', name: 'name', price: 'price', commission: 'commission' },
        'shopee',
      );

      expect(products[0].price).toBe(99.9);
      expect(products[0].commission).toBe(15.5);

      fs.unlinkSync(file);
    });

    it('should skip non-numeric price gracefully', async () => {
      // Shopee exports prices like "7,8k" — quoted in CSV; parseFloat gives partial value; no crash
      const csv = ['id,name,price', 'abc,Product,"7,8k"'].join('\n');
      const file = writeTempCsv(csv);

      await expect(
        importer.parse(file, { id: 'externalId', name: 'name', price: 'price' }, 'shopee'),
      ).resolves.toBeDefined();

      fs.unlinkSync(file);
    });

    it('should include rawData containing original CSV row', async () => {
      const csv = ['id,name,extra', 'abc,Product,somevalue'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(file, { id: 'externalId', name: 'name' }, 'shopee');

      expect(products[0].rawData).toMatchObject({ id: 'abc', name: 'Product', extra: 'somevalue' });

      fs.unlinkSync(file);
    });

    it('should handle BOM-prefixed headers (Shopee CSV export regression)', async () => {
      // Shopee CSVs exported with UTF-8 BOM — first header gets a \uFEFF prefix
      const csv = '\uFEFFid,name\nabc,My Product\n';
      const file = writeTempCsv(csv);

      const products = await importer.parse(
        file,
        { '\uFEFFid': 'externalId', name: 'name' },
        'shopee',
      );

      expect(products).toHaveLength(1);
      expect(products[0].externalId).toBe('abc');

      fs.unlinkSync(file);
    });

    it('should return empty array when file has no data rows', async () => {
      const file = writeTempCsv('id,name\n');

      const products = await importer.parse(file, { id: 'externalId', name: 'name' }, 'shopee');

      expect(products).toHaveLength(0);

      fs.unlinkSync(file);
    });

    it('should map affiliateLink field from CSV (preserve Shopee links)', async () => {
      const csv = ['id,name,link', 'abc,Product,https://s.shopee.vn/TEST123'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(
        file,
        { id: 'externalId', name: 'name', link: 'affiliateLink' },
        'shopee',
      );

      expect(products).toHaveLength(1);
      expect(products[0].affiliateLink).toBe('https://s.shopee.vn/TEST123');

      fs.unlinkSync(file);
    });

    it('should preserve affiliateLink in rawData when not mapped', async () => {
      const csv = ['id,name,affiliate_link', 'abc,Product,https://s.shopee.vn/LINK'].join('\n');
      const file = writeTempCsv(csv);

      const products = await importer.parse(
        file,
        { id: 'externalId', name: 'name' },
        'shopee',
      );

      expect(products[0].rawData.affiliate_link).toBe('https://s.shopee.vn/LINK');
      expect(products[0].affiliateLink).toBeUndefined();

      fs.unlinkSync(file);
    });
  });
});
