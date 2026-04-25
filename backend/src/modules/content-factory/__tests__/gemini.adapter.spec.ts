import { GeminiAdapter } from '../../../shared/ai/gemini.adapter';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createGeneratedContentFixture } from './fixtures/content.fixtures';

jest.mock('@google/generative-ai');

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;
  let configService: ConfigService;
  let mockGenerativeAI: any;
  let mockGenerativeModel: any;


  beforeEach(() => {
    // Setup ConfigService mock
    configService = {
      getOrThrow: jest.fn().mockReturnValue(' '),
      get: jest.fn().mockReturnValue('gemini-1.5-pro'),
    } as unknown as ConfigService;

    // Setup GoogleGenerativeAI mock
    mockGenerativeModel = {
      generateContent: jest.fn(),
    };

    mockGenerativeAI = jest.mocked(GoogleGenerativeAI);
    mockGenerativeAI.prototype.getGenerativeModel = jest
      .fn()
      .mockReturnValue(mockGenerativeModel);

    adapter = new GeminiAdapter(configService);
  });

  describe('generate()', () => {
    it('should call generateContent and return parsed JSON response', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () =>
            '{"title":"Test Title","body":"Test body content"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result).toEqual({
        title: 'Test Title',
        body: 'Test body content',
      });
      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Write about test product'),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('should strip markdown code fences from JSON response', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () => `\`\`\`json
{"title":"Markdown Title","body":"Body with markdown"}
\`\`\``,
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result).toEqual({
        title: 'Markdown Title',
        body: 'Body with markdown',
      });
    });

    it('should handle missing title field', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () => '{"body":"Body without title"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result.body).toBe('Body without title');
      expect(result.title).toBe('{"body":"Body without title"}');
    });


    it('should handle missing body field', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () => '{"title":"Title only"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result.title).toBe('Title only');
      expect(result.body).toBe('{"title":"Title only"}');
    });

    it('should parse JSON with literal unescaped newlines in body (regression: gemini-2.5-flash)', async () => {
      // Arrange — Gemini 2.5-flash emits literal \n inside JSON strings, breaking JSON.parse
      const mockResponse = {
        response: {
          text: () =>
            '{"title":"Product Title","body":"Line one\nLine two\nLine three"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate('test prompt');

      // Assert — regex fallback must recover title and body correctly
      expect(result.title).toBe('Product Title');
      expect(result.body).toContain('Line one');
      expect(result.body).toContain('Line two');
    });

    it('should parse JSON with escaped quotes inside body', async () => {
      const mockResponse = {
        response: {
          text: () =>
            '{"title":"Title","body":"He said \\"great product\\"!"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      const result = await adapter.generate('test prompt');

      expect(result.title).toBe('Title');
      expect(result.body).toBe('He said "great product"!');
    });

    it('should parse JSON with both literal newlines and multi-paragraph body', async () => {
      const title = 'Amazing Earrings';
      const bodyLine1 = 'Perfect for everyday wear.';
      const bodyLine2 = 'Lightweight and stylish.';
      const mockResponse = {
        response: {
          text: () =>
            `{"title":"${title}","body":"${bodyLine1}\n\n${bodyLine2}"}`,
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      const result = await adapter.generate('test prompt');

      expect(result.title).toBe(title);
      expect(result.body).toContain(bodyLine1);
      expect(result.body).toContain(bodyLine2);
    });

    it('should fall back to raw text when JSON parsing fails', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const rawText = 'This is plain text, not JSON at all';
      const mockResponse = {
        response: {
          text: () => rawText,
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result.body).toBe(rawText);
      expect(result.title).toBe('This is plain text, not JSON at all');
    });

    it('should strip newlines from title when falling back to raw text', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const rawText = 'Line 1\nLine 2\nLine 3 and more text';
      const mockResponse = {
        response: {
          text: () => rawText,
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result.title).not.toContain('\n');
      expect(result.title).toBe('Line 1 Line 2 Line 3 and more text');
    });

    it('should handle whitespace-trimmed response', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () =>
            '\n\n{"title":"Trimmed Title","body":"Trimmed body"}\n\n',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result).toEqual({
        title: 'Trimmed Title',
        body: 'Trimmed body',
      });
    });

    it('should truncate title to 120 characters from raw text fallback', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const longText = 'a'.repeat(200); // 200 chars
      const mockResponse = {
        response: {
          text: () => longText,
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result.title).toHaveLength(120);
      expect(result.title).toBe('a'.repeat(120));
    });

    it('should include instruction in generated prompt', async () => {
      // Arrange
      const prompt = 'Original prompt';
      const mockResponse = {
        response: {
          text: () => '{"title":"Title","body":"Body"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      await adapter.generate(prompt);

      // Assert
      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Original prompt'),
                }),
              ]),
            }),
          ]),
        }),
      );
      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Respond with a valid JSON object'),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('should use model from config', async () => {
      // Arrange
      configService.get = jest.fn().mockReturnValue('custom-model');
      const newAdapter = new GeminiAdapter(configService);
      const mockResponse = {
        response: {
          text: () => '{"title":"Title","body":"Body"}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      await newAdapter.generate('test prompt');

      // Assert
      expect(mockGenerativeAI.prototype.getGenerativeModel).toHaveBeenCalledWith({
        model: 'custom-model',
      });
    });

    it('should throw error when generateContent fails', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const error = new Error('API Error');
      mockGenerativeModel.generateContent.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.generate(prompt)).rejects.toThrow('API Error');
    });

    it('should handle null/undefined fields in JSON', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () => '{"title":null,"body":undefined}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      // Should use fallback when fields are null/undefined
      expect(result.title).not.toBe('null');
      expect(result.body).not.toBe('undefined');
    });

    it('should handle empty string fields', async () => {
      // Arrange
      const prompt = 'Write about test product';
      const mockResponse = {
        response: {
          text: () => '{"title":"","body":""}',
        },
      };
      mockGenerativeModel.generateContent.mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.generate(prompt);

      // Assert
      expect(result).toEqual({
        title: '',
        body: '',
      });
    });
  });

  describe('constructor', () => {
    it('should throw if GOOGLE_API_KEY is not set', () => {
      // Arrange
      configService.getOrThrow = jest.fn().mockImplementation(() => {
        throw new Error('GOOGLE_API_KEY not found');
      });

      // Act & Assert
      expect(() => new GeminiAdapter(configService)).toThrow(
        'GOOGLE_API_KEY not found',
      );
    });

    it('should use default model if not configured', () => {
      // Arrange
      configService.get = jest.fn().mockReturnValue(undefined);

      // Act
      new GeminiAdapter(configService);

      // Assert
      expect(mockGenerativeAI.prototype.getGenerativeModel).not.toHaveBeenCalled(); // Not called in constructor
      // The default model would be used on first call
    });
  });
});
