export interface PublishPayload {
  title?: string;
  body: string;
  imageUrl?: string;
  tags?: string[];
}

export interface PublishResult {
  success: boolean;
  publishedLink?: string;
  errorMessage?: string;
}

export const WORDPRESS_ADAPTER = Symbol('WORDPRESS_ADAPTER');
export const FACEBOOK_ADAPTER = Symbol('FACEBOOK_ADAPTER');

export interface IPublisherAdapter {
  platform: string;
  publish(payload: PublishPayload): Promise<PublishResult>;
  isConfigured(): boolean;
}
