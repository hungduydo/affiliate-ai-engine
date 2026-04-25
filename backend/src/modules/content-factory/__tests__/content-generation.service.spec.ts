import { ContentGenerationService } from '../application/content-generation.service';
import { ContentPrismaService } from '../prisma/prisma.service';
import { GeminiAdapter } from '../../../shared/ai/gemini.adapter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../queue-engine/queue.service';
import { ContentStatus, Platform, ContentType } from '@prisma-client/content-factory';
import { of, throwError } from 'rxjs';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';


import {
  createContentFixture,
  createProductFixture,
  createPromptFixture,
  createGeneratedContentFixture,
} from './fixtures/content.fixtures';

jest.mock('../../../shared/ai/gemini.adapter');

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  let prisma: DeepMockProxy<ContentPrismaService>;
  let gemini: jest.Mocked<GeminiAdapter>;
  let http: jest.Mocked<HttpService>;
  let config: ConfigService;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(() => {
    prisma = mockDeep<ContentPrismaService>();

    gemini = {
      generate: jest.fn(),
      generateWithDNA: jest.fn(),
    } as unknown as jest.Mocked<GeminiAdapter>;

    http = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    config = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as ConfigService;

    queueService = {
      addJob: jest.fn().mockResolvedValue('mock-job-id'),
    } as unknown as jest.Mocked<QueueService>;

    service = new ContentGenerationService(prisma, gemini, http, queueService, config);
  });

  describe('generate()', () => {
    const contentId = 'content-123';
    const productId = 'prod-123';
    const product = createProductFixture({ id: productId });
    const prompt = createPromptFixture();
    const generatedContent = createGeneratedContentFixture();

    it('should generate content successfully with happy path', async () => {
      // Arrange
      const content = createContentFixture({
        id: contentId,
        productId: productId,
        status: ContentStatus.RAW,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return of({ data: product } as any);
        }
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(generatedContent);
      prisma.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.GENERATED,
      } as any);

      // Act
      await service.generate(contentId);

      // Assert
      expect(prisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: contentId },
      });
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: { status: ContentStatus.AI_PROCESSING },
      });
      expect(http.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/internal/products/prod-123',
      );
      expect(gemini.generate).toHaveBeenCalled();
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: {
          title: generatedContent.title,
          body: generatedContent.body,
          status: ContentStatus.GENERATED,
        },
      });
    });

    it('should throw if content not found', async () => {
      // Arrange
      prisma.content.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate(contentId)).rejects.toThrow(
        `Content ${contentId} not found`,
      );
    });

    it('should mark content as AI_PROCESSING before generation', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockReturnValue(of({ data: product } as any));
      gemini.generate.mockResolvedValue(generatedContent);
      prisma.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.GENERATED,
      } as any);

      // Act
      await service.generate(contentId);

      // Assert
      const updateCalls = (prisma.content.update as jest.Mock).mock.calls;
      expect(updateCalls[0][0].data.status).toBe(ContentStatus.AI_PROCESSING);
    });

    it('should fetch product via internal API', async () => {
      // Arrange
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockReturnValue(of({ data: product } as any));
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/internal/products/${productId}`),
      );
    });

    it('should fetch prompt template by ID if promptId is set', async () => {
      // Arrange
      const promptId = 'prompt-456';
      const content = createContentFixture({
        productId,
        promptId,
        status: ContentStatus.RAW,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return of({ data: product } as any);
        }
        if (url.includes(`prompts/${promptId}`)) {
          return of({ data: prompt } as any);
        }
        return throwError(() => new Error('Not found'));
      });
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/internal/prompts/${promptId}`),
      );
    });

    it('should fetch prompt by platform and contentType if no promptId', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
        promptId: null,
        status: ContentStatus.RAW,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return of({ data: product } as any);
        }
        if (url.includes('isActive=true')) {
          return of({ data: { data: [prompt] } } as any);
        }
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining(
          'platform=WORDPRESS&contentType=BLOG_POST&isActive=true',
        ),
      );
    });

    it('should use default prompt if no template found', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
        promptId: null,
        status: ContentStatus.RAW,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return of({ data: product } as any);
        }
        if (url.includes('prompts')) {
          return of({ data: { data: [] } } as any); // No templates
        }
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('Write a compelling'),
      );
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('blog post'),
      );
    });

    it('should render prompt with product variables', async () => {
      // Arrange
      const content = createContentFixture({ productId });
      const customPrompt = {
        ...prompt,
        template: 'Product: {{name}}, Price: {{price}}, Link: {{affiliateLink}}',
      };
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return of({ data: product } as any);
        }
        return of({ data: { data: [customPrompt] } } as any);
      });
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      const geminiCall = (gemini.generate as jest.Mock).mock.calls[0][0];
      expect(geminiCall).toContain(product.name);
      expect(geminiCall).toContain(String(product.price));
      expect(geminiCall).toContain(product.affiliateLink);
    });

    it('should handle missing product description', async () => {
      // Arrange
      const productNoDesc = { ...product, description: undefined };
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return of({ data: productNoDesc } as any);
        }
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      const geminiCall = (gemini.generate as jest.Mock).mock.calls[0][0];
      expect(geminiCall).toContain('Description: '); // Should have empty value
    });

    it('should handle product fetch failure', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) {
          return throwError(
            () => new Error('Product not found'),
          );
        }
        return of({ data: {} } as any);
      });

      // Act & Assert
      await expect(service.generate(contentId)).rejects.toThrow(
        'Product not found',
      );
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: { status: ContentStatus.FAILED },
      });
    });

    it('should mark content as FAILED on Gemini error', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockReturnValue(of({ data: product } as any));
      gemini.generate.mockRejectedValue(new Error('Gemini API error'));

      // Act & Assert
      await expect(service.generate(contentId)).rejects.toThrow(
        'Gemini API error',
      );
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: { status: ContentStatus.FAILED },
      });
    });

    it('should mark content as FAILED on any error', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockReturnValue(
        throwError(() => new Error('HTTP error')),
      );

      // Act & Assert
      await expect(service.generate(contentId)).rejects.toThrow('HTTP error');
      const updateCalls = (prisma.content.update as jest.Mock).mock.calls;
      expect(updateCalls[updateCalls.length - 1][0].data.status).toBe(
        ContentStatus.FAILED,
      );
    });

    it('should save generated title and body', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockReturnValue(of({ data: product } as any));
      gemini.generate.mockResolvedValue({
        title: 'Generated Title',
        body: 'Generated Body Content',
      });

      // Act
      await service.generate(contentId);

      // Assert
      const updateCall = (prisma.content.update as jest.Mock).mock.calls[1][0]; // Second update (final)
      expect(updateCall.data).toEqual({
        title: 'Generated Title',
        body: 'Generated Body Content',
        status: ContentStatus.GENERATED,
      });
    });

    it('should set status to GENERATED on success', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockReturnValue(of({ data: product } as any));
      gemini.generate.mockResolvedValue(generatedContent);

      // Act
      await service.generate(contentId);

      // Assert
      const updateCalls = (prisma.content.update as jest.Mock).mock.calls;
      const lastCall = updateCalls[updateCalls.length - 1][0];
      expect(lastCall.data.status).toBe(ContentStatus.GENERATED);
    });
  });

  // --- Test 6: Generate content for an ACTIVE product → uses DNA for richer output ---

  describe('generate() with ProductDNA', () => {
    const contentId = 'content-123';
    const productId = 'prod-123';
    const dna = {
      coreProblem: 'Struggling to lose weight',
      keyFeatures: [{ feature: 'Natural formula', emotionalBenefit: 'Feel safe' }],
      targetPersona: { demographics: 'Adults 25-45', psychographics: 'Health-conscious' },
      objectionHandling: [{ objection: 'Too expensive', counter: 'Worth every penny' }],
      visualAnchors: ['before/after photos'],
    };
    const productWithDna = createProductFixture({
      id: productId,
      status: 'ACTIVE',
      productDna: dna,
      dnaExtractedAt: new Date(),
    });
    const prompt = createPromptFixture();
    const richContent = createGeneratedContentFixture({
      title: 'DNA-enhanced Title',
      body: 'Richer body leveraging DNA context',
    });

    it('should call generateWithDNA when product has DNA', async () => {
      // Arrange
      const content = createContentFixture({ id: contentId, productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productWithDna } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      (gemini.generateWithDNA as jest.Mock).mockResolvedValue(richContent);

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generateWithDNA).toHaveBeenCalledWith(
        expect.any(String),
        dna,
      );
      expect(gemini.generate).not.toHaveBeenCalled();
    });

    it('should call plain generate when product has no DNA', async () => {
      // Arrange
      const productNoDna = createProductFixture({ id: productId, productDna: null });
      const content = createContentFixture({ id: contentId, productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productNoDna } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      (gemini.generate as jest.Mock).mockResolvedValue(richContent);

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalled();
      expect(gemini.generateWithDNA).not.toHaveBeenCalled();
    });

    it('should save DNA-generated title and body to content', async () => {
      // Arrange
      const content = createContentFixture({ id: contentId, productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productWithDna } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      (gemini.generateWithDNA as jest.Mock).mockResolvedValue(richContent);

      // Act
      await service.generate(contentId);

      // Assert
      const updateCalls = (prisma.content.update as jest.Mock).mock.calls;
      const finalUpdate = updateCalls[updateCalls.length - 1][0];
      expect(finalUpdate.data).toEqual({
        title: richContent.title,
        body: richContent.body,
        status: ContentStatus.GENERATED,
      });
    });

    it('should pass the DNA object directly to generateWithDNA', async () => {
      // Arrange
      const content = createContentFixture({ id: contentId, productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productWithDna } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      (gemini.generateWithDNA as jest.Mock).mockResolvedValue(richContent);

      // Act
      await service.generate(contentId);

      // Assert — the exact DNA object is forwarded, not a copy
      const [, passedDna] = (gemini.generateWithDNA as jest.Mock).mock.calls[0];
      expect(passedDna).toEqual(dna);
      expect(passedDna).toHaveProperty('coreProblem');
      expect(passedDna).toHaveProperty('keyFeatures');
      expect(passedDna).toHaveProperty('targetPersona');
      expect(passedDna).toHaveProperty('objectionHandling');
      expect(passedDna).toHaveProperty('visualAnchors');
    });

    it('should mark content as FAILED if generateWithDNA throws', async () => {
      // Arrange
      const content = createContentFixture({ id: contentId, productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productWithDna } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      (gemini.generateWithDNA as jest.Mock).mockRejectedValue(new Error('AI error'));

      // Act & Assert
      await expect(service.generate(contentId)).rejects.toThrow('AI error');
      const failCalls = (prisma.content.update as jest.Mock).mock.calls;
      const lastUpdate = failCalls[failCalls.length - 1][0];
      expect(lastUpdate.data.status).toBe(ContentStatus.FAILED);
    });
  });

  describe('generate() - edge cases', () => {
    const contentId = 'content-123';
    const productId = 'prod-123';
    const prompt = createPromptFixture();

    it('should handle missing product price', async () => {
      // Arrange
      const productNoPrice = createProductFixture({ price: undefined });
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productNoPrice } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      const geminiCall = (gemini.generate as jest.Mock).mock.calls[0][0];
      expect(geminiCall).toContain('Price: '); // Should render as empty
    });

    it('should handle missing product commission', async () => {
      // Arrange
      const productNoCommission = createProductFixture({ commission: undefined });
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productNoCommission } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      const geminiCall = (gemini.generate as jest.Mock).mock.calls[0][0];
      expect(geminiCall).toContain('Commission: '); // Should render as empty
    });

    it('should handle missing affiliateLink', async () => {
      // Arrange
      const productNoLink = createProductFixture({ affiliateLink: undefined as any });
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productNoLink } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert - should not throw
      expect(gemini.generate).toHaveBeenCalled();
    });

    it('should handle missing imageUrl', async () => {
      // Arrange
      const productNoImage = createProductFixture({ imageUrl: undefined });
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productNoImage } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalled();
    });

    it('should use first template when multiple templates returned', async () => {
      // Arrange
      const template2 = { ...prompt, id: 'prompt-456', name: 'Second template' };
      const content = createContentFixture({ productId, promptId: null });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        if (url.includes('isActive=true')) return of({ data: { data: [prompt, template2] } } as any);
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert - should use first template (prompt)
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining(prompt.template.substring(0, 20)),
      );
    });

    it('should handle HTTP response with undefined data property', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        // Return response without data property
        return of({ } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert - should fall back to default prompt
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('Write a compelling'),
      );
    });

    it('should handle content with PENDING_APPROVAL status', async () => {
      // Arrange - content in PENDING_APPROVAL should still process
      const content = createContentFixture({ status: ContentStatus.PENDING_APPROVAL });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());
      prisma.content.update.mockResolvedValue({} as any);

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalled();
    });

    it('should handle content with FAILED status (re-run)', async () => {
      // Arrange - content in FAILED should allow re-run
      const content = createContentFixture({ status: ContentStatus.FAILED });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());
      prisma.content.update.mockResolvedValue({} as any);

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalled();
    });

    it('should handle empty product name gracefully', async () => {
      // Arrange
      const productEmptyName = createProductFixture({ name: '' });
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productEmptyName } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert - empty name renders as "about ." in the prompt
      expect(gemini.generate).toHaveBeenCalled();
      const callArg = (gemini.generate as jest.Mock).mock.calls[0][0];
      expect(callArg).toContain('about .');
    });

    it('should handle product with null description', async () => {
      // Arrange
      const productNullDesc = createProductFixture({ description: null });
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: productNullDesc } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      const geminiCall = (gemini.generate as jest.Mock).mock.calls[0][0];
      expect(geminiCall).toContain('Description: '); // null should render as empty string
    });
  });

  describe('buildDefaultPrompt() - content type variations', () => {
    const contentId = 'content-123';
    const productId = 'prod-123';
    const product = createProductFixture();

    it('should build CAROUSEL default prompt', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.FACEBOOK,
        contentType: ContentType.CAROUSEL,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        if (url.includes('prompts')) return of({ data: { data: [] } } as any); // No template
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('7-slide Instagram/Facebook carousel'),
      );
    });

    it('should build THREAD default prompt', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.TIKTOK,
        contentType: ContentType.THREAD,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        if (url.includes('prompts')) return of({ data: { data: [] } } as any);
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('5-post X (Twitter) authority thread'),
      );
    });

    it('should build HERO_COPY default prompt', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.WORDPRESS,
        contentType: ContentType.HERO_COPY,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        if (url.includes('prompts')) return of({ data: { data: [] } } as any);
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('Hero section copy'),
      );
    });

    it('should build TIKTOK VIDEO_SCRIPT default prompt', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.TIKTOK,
        contentType: ContentType.VIDEO_SCRIPT,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        if (url.includes('prompts')) return of({ data: { data: [] } } as any);
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('45-second TikTok/Reels video script'),
      );
    });

    it('should build FACEBOOK SOCIAL_POST default prompt', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.FACEBOOK,
        contentType: ContentType.SOCIAL_POST,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        if (url.includes('prompts')) return of({ data: { data: [] } } as any);
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('TEA Framework'),
      );
    });

    it('should build generic fallback prompt for unknown content type', async () => {
      // Arrange
      const content = createContentFixture({
        platform: Platform.WORDPRESS,
        contentType: 'UNKNOWN_TYPE' as ContentType,
        promptId: null,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        if (url.includes('prompts')) return of({ data: { data: [] } } as any);
        return of({ data: {} } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await service.generate(contentId);

      // Assert
      expect(gemini.generate).toHaveBeenCalledWith(
        expect.stringContaining('Write a compelling'),
      );
    });
  });

  describe('generate() - error handling edge cases', () => {
    const contentId = 'content-123';
    const productId = 'prod-123';
    const prompt = createPromptFixture();

    it('should mark FAILED when prompt template fetch fails', async () => {
      // Arrange
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        // Prompt fetch fails
        return throwError(() => new Error('Template service unavailable'));
      });

      // Act & Assert
      await expect(service.generate(contentId)).rejects.toThrow('Template service unavailable');
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: { status: ContentStatus.FAILED },
      });
    });

    it('should handle AI adapter returning incomplete result', async () => {
      // Arrange
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      // AI returns only title, no body
      gemini.generate.mockResolvedValue({ title: 'Only Title' } as any);
      prisma.content.update.mockResolvedValue({} as any);

      // Act
      await service.generate(contentId);

      // Assert - should save what was returned
      const updateCall = (prisma.content.update as jest.Mock).mock.calls[1][0];
      expect(updateCall.data.title).toBe('Only Title');
      expect(updateCall.data.body).toBeUndefined();
    });

    it('should handle AI adapter returning empty strings', async () => {
      // Arrange
      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue({ title: '', body: '' });
      prisma.content.update.mockResolvedValue({} as any);

      // Act
      await service.generate(contentId);

      // Assert - should save empty strings
      const updateCall = (prisma.content.update as jest.Mock).mock.calls[1][0];
      expect(updateCall.data.title).toBe('');
      expect(updateCall.data.body).toBe('');
    });

    it('should use BACKEND_INTERNAL_URL from config', async () => {
      // Arrange
      const customConfig = {
        get: jest.fn().mockReturnValue('http://custom-internal:4000'),
      } as unknown as ConfigService;
      const customService = new ContentGenerationService(prisma, gemini, http, queueService, customConfig);

      const content = createContentFixture({ productId });
      prisma.content.findUnique.mockResolvedValue(content as any);
      http.get.mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: createProductFixture() } as any);
        return of({ data: { data: [prompt] } } as any);
      });
      gemini.generate.mockResolvedValue(createGeneratedContentFixture());

      // Act
      await customService.generate(contentId);

      // Assert
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('http://custom-internal:4000'),
      );
    });
  });
});
