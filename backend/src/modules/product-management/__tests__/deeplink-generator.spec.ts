import { DeeplinkGenerator } from '../infrastructure/deeplink-generator';

describe('DeeplinkGenerator', () => {
  let generator: DeeplinkGenerator;

  beforeEach(() => {
    generator = new DeeplinkGenerator();
  });

  describe('generate()', () => {
    it('should use provided Shopee affiliate link instead of generating', () => {
      const providedLink = 'https://s.shopee.vn/7KsdnGJ1L4';
      const result = generator.generate('shopee', '56857075873', providedLink);
      expect(result).toBe(providedLink);
    });

    it('should generate Shopee deeplink when no baseUrl provided', () => {
      const result = generator.generate('shopee', '56857075873');
      expect(result).toContain('shope.ee/affiliate');
      expect(result).toContain('product_id=56857075873');
    });

    it('should use baseUrl as fallback for unknown sources', () => {
      const result = generator.generate('unknown', 'id123', 'https://custom.link');
      expect(result).toBe('https://custom.link');
    });

    it('should generate default link for unknown source when no baseUrl', () => {
      const result = generator.generate('unknown', 'id123');
      expect(result).toContain('affiliate.example.com');
      expect(result).toContain('unknown/id123');
    });

    it('should preserve various Shopee affiliate link formats', () => {
      const links = [
        'https://s.shopee.vn/7KsdnGJ1L4',
        'https://s.shopee.sg/ABC123',
        'https://s.shopee.com.br/XYZ789',
      ];

      links.forEach((link) => {
        const result = generator.generate('shopee', 'productId', link);
        expect(result).toBe(link);
      });
    });
  });
});
