import { ContentService } from '../application/content.service';
import { ContentPrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { ContentStatus, Platform, ContentType } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  createContentFixture,
  createGeneratedContentFixture,
} from './fixtures/content.fixtures';

describe('ContentService', () => {
  let service: ContentService;
  let prisma: DeepMockProxy<ContentPrismaService>;

  beforeEach(() => {
    prisma = mockDeep<ContentPrismaService>();
    service = new ContentService(prisma);
  });

  describe('create()', () => {
    it('should create content with RAW status', async () => {
      // Arrange
      const dto = {
        productId: 'prod-123',
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
      };
      const expectedContent = createContentFixture({
        productId: 'prod-123',
        status: ContentStatus.RAW,
      });
      prisma.content.create.mockResolvedValue(expectedContent as any);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.status).toBe(ContentStatus.RAW);
      expect(prisma.content.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-123',
          platform: Platform.WORDPRESS,
          contentType: ContentType.BLOG_POST,
          title: null,
          body: '',
          promptId: null,
          status: ContentStatus.RAW,
        },
      });
    });

    it('should create content with optional title', async () => {
      // Arrange
      const dto = {
        productId: 'prod-123',
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
        title: 'Custom Title',
      };
      const expectedContent = createContentFixture({ title: 'Custom Title' });
      prisma.content.create.mockResolvedValue(expectedContent as any);

      // Act
      await service.create(dto);

      // Assert
      expect(prisma.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Custom Title',
        }),
      });
    });

    it('should create content with promptId if provided', async () => {
      // Arrange
      const dto = {
        productId: 'prod-123',
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
        promptId: 'prompt-456',
      };
      const expectedContent = createContentFixture({ promptId: 'prompt-456' });
      prisma.content.create.mockResolvedValue(expectedContent as any);

      // Act
      await service.create(dto);

      // Assert
      expect(prisma.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          promptId: 'prompt-456',
        }),
      });
    });

    it('should default body to empty string', async () => {
      // Arrange
      const dto = {
        productId: 'prod-123',
        platform: Platform.WORDPRESS,
        contentType: ContentType.BLOG_POST,
      };
      prisma.content.create.mockResolvedValue(createContentFixture() as any);

      // Act
      await service.create(dto);

      // Assert
      expect(prisma.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          body: '',
        }),
      });
    });
  });

  describe('findById()', () => {
    it('should return content if found', async () => {
      // Arrange
      const content = createContentFixture();
      prisma.content.findUnique.mockResolvedValue(content as any);

      // Act
      const result = await service.findById('content-123');

      // Assert
      expect(result).toEqual(content);
      expect(prisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: 'content-123' },
      });
    });

    it('should throw NotFoundException if content not found', async () => {
      // Arrange
      prisma.content.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('not-found')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('not-found')).rejects.toThrow(
        'Content not-found not found',
      );
    });
  });

  describe('findMany()', () => {
    it('should list content with pagination', async () => {
      // Arrange
      const content = [createContentFixture(), createContentFixture()];
      prisma.$transaction.mockResolvedValue([content, 2]);

      // Act
      const result = await service.findMany({
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.data).toEqual(content);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by productId', async () => {
      // Arrange
      const content = [createContentFixture({ productId: 'prod-123' })];
      prisma.$transaction.mockResolvedValue([content, 1]);

      // Act
      await service.findMany({
        page: 1,
        limit: 20,
        productId: 'prod-123',
      });

      // Assert
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          productId: 'prod-123',
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      // Arrange
      prisma.$transaction.mockResolvedValue([[], 0]);

      // Act
      await service.findMany({
        page: 1,
        limit: 20,
        status: ContentStatus.GENERATED,
      });

      // Assert
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          status: ContentStatus.GENERATED,
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });


    it('should filter by platform', async () => {
      // Arrange
      prisma.$transaction.mockResolvedValue([[], 0]);

      // Act
      await service.findMany({
        page: 1,
        limit: 20,
        platform: Platform.FACEBOOK,
      });

      // Assert
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          platform: Platform.FACEBOOK,
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });


    it('should calculate correct skip value for pagination', async () => {
      // Arrange
      prisma.$transaction.mockResolvedValue([[], 0]);

      // Act
      await service.findMany({
        page: 3,
        limit: 10,
      });

      // Assert
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 20, // (3-1) * 10
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });


    it('should calculate totalPages correctly', async () => {
      // Arrange
      prisma.$transaction.mockResolvedValue([[], 45]);

      // Act
      const result = await service.findMany({
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.totalPages).toBe(3); // ceil(45/20)
    });
  });

  describe('updateStatus()', () => {
    it('should allow RAW → AI_PROCESSING transition', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      prisma.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.AI_PROCESSING,
      } as any);

      // Act
      await service.updateStatus('content-123', ContentStatus.AI_PROCESSING);

      // Assert
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: { status: ContentStatus.AI_PROCESSING },
      });
    });

    it('should allow RAW → FAILED transition', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);
      prisma.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.FAILED,
      } as any);

      // Act
      await service.updateStatus('content-123', ContentStatus.FAILED);

      // Assert
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: { status: ContentStatus.FAILED },
      });
    });

    it('should allow AI_PROCESSING → GENERATED transition', async () => {
      // Arrange
      const content = createContentFixture({
        status: ContentStatus.AI_PROCESSING,
      });
      prisma.content.findUnique.mockResolvedValue(content as any);
      prisma.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.GENERATED,
      } as any);

      // Act
      await service.updateStatus('content-123', ContentStatus.GENERATED);

      // Assert
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: { status: ContentStatus.GENERATED },
      });
    });

    it('should reject invalid RAW → GENERATED transition', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.RAW });
      prisma.content.findUnique.mockResolvedValue(content as any);

      // Act & Assert
      await expect(
        service.updateStatus('content-123', ContentStatus.GENERATED),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('content-123', ContentStatus.GENERATED),
      ).rejects.toThrow('Cannot transition from RAW to GENERATED');
    });

    it('should reject invalid GENERATED → RAW transition', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.GENERATED });
      prisma.content.findUnique.mockResolvedValue(content as any);

      // Act & Assert
      await expect(
        service.updateStatus('content-123', ContentStatus.RAW),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if content does not exist', async () => {
      // Arrange
      prisma.content.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateStatus('not-found', ContentStatus.AI_PROCESSING),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow FAILED → RAW transition (retry)', async () => {
      // Arrange
      const content = createContentFixture({ status: ContentStatus.FAILED });
      prisma.content.findUnique.mockResolvedValue(content as any);
      prisma.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.RAW,
      } as any);

      // Act
      await service.updateStatus('content-123', ContentStatus.RAW);

      // Assert
      expect(prisma.content.update).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('should update title and body', async () => {
      // Arrange
      const content = createContentFixture();
      prisma.content.findUnique.mockResolvedValue(content as any);
      const updated = {
        ...content,
        title: 'New Title',
        body: 'New body content',
      };
      prisma.content.update.mockResolvedValue(updated as any);

      // Act
      await service.update('content-123', {
        title: 'New Title',
        body: 'New body content',
      });

      // Assert
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: {
          title: 'New Title',
          body: 'New body content',
        },
      });
    });

    it('should update only title', async () => {
      // Arrange
      const content = createContentFixture();
      prisma.content.findUnique.mockResolvedValue(content as any);
      const updated = { ...content, title: 'New Title' };
      prisma.content.update.mockResolvedValue(updated as any);

      // Act
      await service.update('content-123', { title: 'New Title' });

      // Assert
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: {
          title: 'New Title',
        },
      });
    });

    it('should update only body', async () => {
      // Arrange
      const content = createContentFixture();
      prisma.content.findUnique.mockResolvedValue(content as any);
      const updated = { ...content, body: 'New body' };
      prisma.content.update.mockResolvedValue(updated as any);

      // Act
      await service.update('content-123', { body: 'New body' });

      // Assert
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: {
          body: 'New body',
        },
      });
    });

    it('should not update if content does not exist', async () => {
      // Arrange
      prisma.content.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('not-found', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.content.update).not.toHaveBeenCalled();
    });

    it('should not include undefined fields in update', async () => {
      // Arrange
      const content = createContentFixture();
      prisma.content.findUnique.mockResolvedValue(content as any);
      prisma.content.update.mockResolvedValue(content as any);

      // Act
      await service.update('content-123', { title: 'New Title' });

      // Assert
      const updateCall = (prisma.content.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('body');
    });
  });

  describe('getContent()', () => {
    it('should call findMany with correct filters', async () => {
      // Arrange
      prisma.$transaction.mockResolvedValue([[], 0]);

      // Act
      await service.getContent({
        platform: 'WORDPRESS',
        status: 'GENERATED',
        productId: 'prod-123',
        page: 2,
        pageSize: 15,
      });

      // Assert
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          platform: 'WORDPRESS',
          status: 'GENERATED',
          productId: 'prod-123',
        },
        skip: 15, // (2-1) * 15
        take: 15,
        orderBy: { createdAt: 'desc' },
      });
    });


    it('should use default pagination values', async () => {
      // Arrange
      prisma.$transaction.mockResolvedValue([[], 0]);

      // Act
      await service.getContent({});

      // Assert
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10, // default pageSize
        orderBy: { createdAt: 'desc' },
      });
    });

  });

  describe('getContentById()', () => {
    it('should return content if found', async () => {
      // Arrange
      const content = createContentFixture();
      prisma.content.findUnique.mockResolvedValue(content as any);

      // Act
      const result = await service.getContentById('content-123');

      // Assert
      expect(result).toEqual(content);
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      prisma.content.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getContentById('not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
