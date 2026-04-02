import { BufferAdapter } from '../infrastructure/buffer.adapter';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { createProviderCredentialsFixture, createPublishPayloadFixture } from './fixtures/publishing.fixtures';

const makeGraphQLSuccess = (postId: string) => ({
  data: {
    data: { createPost: { post: { id: postId } } },
    errors: undefined,
  },
});

const makeGraphQLMutationError = (message: string) => ({
  data: {
    data: { createPost: { message } },
    errors: undefined,
  },
});

const makeGraphQLTopLevelError = (message: string) => ({
  data: {
    data: { createPost: {} },
    errors: [{ message }],
  },
});

const makeChannelsResponse = (channels: { id: string; name: string; service: string }[]) => ({
  data: {
    data: { channels },
    errors: undefined,
  },
});

describe('BufferAdapter', () => {
  let adapter: BufferAdapter;
  let http: jest.Mocked<HttpService>;

  beforeEach(() => {
    http = { post: jest.fn() } as unknown as jest.Mocked<HttpService>;
    adapter = new BufferAdapter(http);
  });

  // ---------------------------------------------------------------------------
  // isConfigured()
  // ---------------------------------------------------------------------------

  describe('isConfigured()', () => {
    it('should return true when both apiToken and organizationId are present', () => {
      expect(adapter.isConfigured({ apiToken: 'tok', organizationId: 'org' })).toBe(true);
    });

    it('should return false when apiToken is missing', () => {
      expect(adapter.isConfigured({ organizationId: 'org' })).toBe(false);
    });

    it('should return false when organizationId is missing', () => {
      expect(adapter.isConfigured({ apiToken: 'tok' })).toBe(false);
    });

    it('should return false when credentials are empty', () => {
      expect(adapter.isConfigured({})).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // publish() — credential & configuration guard
  // ---------------------------------------------------------------------------

  describe('publish() — guard conditions', () => {
    it('should return error when credentials are not configured', async () => {
      const result = await adapter.publish(createPublishPayloadFixture(), 'twitter', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('credentials not configured');
    });

    it('should return error when channel is not found for platform', async () => {
      const creds = createProviderCredentialsFixture();
      // Channels response returns empty array — no twitter channel
      http.post.mockReturnValue(of(makeChannelsResponse([]) as any));

      const result = await adapter.publish(createPublishPayloadFixture(), 'twitter', creds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No Buffer channel found for platform: twitter');
    });

    it('should return error when image is required but missing', async () => {
      const creds = createProviderCredentialsFixture();
      // Return an instagram channel
      http.post.mockReturnValueOnce(
        of(makeChannelsResponse([{ id: 'ch-1', name: 'My IG', service: 'instagram' }]) as any),
      );

      const payload = createPublishPayloadFixture({ imageUrl: undefined });
      delete (payload as any).imageUrl;

      const result = await adapter.publish(payload, 'instagram', creds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('instagram requires an image');
    });
  });

  // ---------------------------------------------------------------------------
  // publish() — successful paths
  // ---------------------------------------------------------------------------

  describe('publish() — success', () => {
    const creds = createProviderCredentialsFixture();
    const channelsRes = makeChannelsResponse([{ id: 'ch-twitter', name: 'My Twitter', service: 'twitter' }]);

    it('should return success with publishedLink on happy path', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))         // loadChannels
        .mockReturnValueOnce(of(makeGraphQLSuccess('post-id-999') as any)); // createPost

      const result = await adapter.publish(createPublishPayloadFixture(), 'twitter', creds);
      expect(result.success).toBe(true);
      expect(result.publishedLink).toBe('https://publish.buffer.com/posts/post-id-999');
    });

    it('should call Buffer API with correct authorization header', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('post-abc') as any));

      await adapter.publish(createPublishPayloadFixture(), 'twitter', creds);

      const createPostCall = http.post.mock.calls[1];
      expect(createPostCall[2]?.headers?.Authorization).toBe(`Bearer ${creds.apiToken}`);
    });

    it('should include channelId in the createPost mutation', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish(createPublishPayloadFixture(), 'twitter', creds);

      const mutationBody = http.post.mock.calls[1][1] as { query: string };
      expect(mutationBody.query).toContain('ch-twitter');
    });
  });

  // ---------------------------------------------------------------------------
  // publish() — error handling
  // ---------------------------------------------------------------------------

  describe('publish() — error handling', () => {
    const creds = createProviderCredentialsFixture();
    const channelsRes = makeChannelsResponse([{ id: 'ch-fb', name: 'My FB', service: 'facebook' }]);

    it('should return error when GraphQL top-level errors are returned', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLTopLevelError('Permission denied') as any));

      const result = await adapter.publish(createPublishPayloadFixture(), 'facebook', creds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Permission denied');
    });

    it('should return error when createPost returns a MutationError message', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLMutationError('Invalid post: needs a type') as any));

      const result = await adapter.publish(createPublishPayloadFixture(), 'facebook', creds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid post: needs a type');
    });

    it('should return error when loadChannels throws', async () => {
      http.post.mockReturnValueOnce(throwError(() => new Error('Network error')));

      const result = await adapter.publish(createPublishPayloadFixture(), 'twitter', creds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Failed to load Buffer channels');
    });

    it('should return error when createPost HTTP call throws', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(throwError(() => new Error('Timeout')));

      const result = await adapter.publish(createPublishPayloadFixture(), 'facebook', creds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Timeout');
    });
  });

  // ---------------------------------------------------------------------------
  // Text transformation
  // ---------------------------------------------------------------------------

  describe('text transformation', () => {
    const creds = createProviderCredentialsFixture();

    it('should truncate text to 280 chars for twitter', async () => {
      const longBody = 'x'.repeat(300);
      const channelsRes = makeChannelsResponse([{ id: 'ch-tw', name: 'Twitter', service: 'twitter' }]);

      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish({ body: longBody }, 'twitter', creds);

      const mutationBody = http.post.mock.calls[1][1] as { query: string };
      // Text in the mutation should be ≤280 chars (truncated with '...')
      const textMatch = mutationBody.query.match(/text: "([^"]+)"/);
      expect(textMatch?.[1].length).toBeLessThanOrEqual(280);
      expect(mutationBody.query).toContain('...');
    });

    it('should prepend title for linkedin posts', async () => {
      const channelsRes = makeChannelsResponse([{ id: 'ch-li', name: 'LinkedIn', service: 'linkedin' }]);
      const payload = { title: 'My Post Title', body: 'Body content' };

      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish(payload, 'linkedin', creds);

      const mutationBody = http.post.mock.calls[1][1] as { query: string };
      // The mutation text should include both title and body
      expect(mutationBody.query).toContain('My Post Title');
      expect(mutationBody.query).toContain('Body content');
    });

    it('should not prepend title for twitter posts', async () => {
      const channelsRes = makeChannelsResponse([{ id: 'ch-tw', name: 'Twitter', service: 'twitter' }]);
      const payload = { title: 'Tweet Title', body: 'Just the tweet' };

      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish(payload, 'twitter', creds);

      const mutationBody = http.post.mock.calls[1][1] as { query: string };
      // Twitter does NOT prepend title — only the body appears
      expect(mutationBody.query).toContain('Just the tweet');
      expect(mutationBody.query).not.toContain('Tweet Title');
    });
  });

  // ---------------------------------------------------------------------------
  // Scheduling mode
  // ---------------------------------------------------------------------------

  describe('scheduling', () => {
    const creds = createProviderCredentialsFixture();
    const channelsRes = makeChannelsResponse([{ id: 'ch-tw', name: 'Twitter', service: 'twitter' }]);

    it('should use mode addToQueue by default', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish({ body: 'Hello' }, 'twitter', creds);

      const mutation = (http.post.mock.calls[1][1] as { query: string }).query;
      expect(mutation).toContain('addToQueue');
    });

    it('should use mode shareNow when specified', async () => {
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish(
        { body: 'Hello', platformOptions: { mode: 'shareNow' } },
        'twitter',
        creds,
      );

      const mutation = (http.post.mock.calls[1][1] as { query: string }).query;
      expect(mutation).toContain('shareNow');
    });

    it('should include dueAt when mode is customScheduled', async () => {
      const dueAt = '2026-05-01T12:00:00Z';
      http.post
        .mockReturnValueOnce(of(channelsRes as any))
        .mockReturnValueOnce(of(makeGraphQLSuccess('p1') as any));

      await adapter.publish(
        { body: 'Scheduled', platformOptions: { mode: 'customScheduled', dueAt } },
        'twitter',
        creds,
      );

      const mutation = (http.post.mock.calls[1][1] as { query: string }).query;
      expect(mutation).toContain('customScheduled');
      expect(mutation).toContain(dueAt);
    });
  });
});
