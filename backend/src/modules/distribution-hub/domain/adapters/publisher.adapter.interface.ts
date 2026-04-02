// Base payload — shared by all adapters
export interface PublishAsset {
  url: string;
  type: 'image' | 'video';
}

export interface PublishPayload {
  title?: string;
  body: string;
  imageUrl?: string;
  assets?: PublishAsset[];
  tags?: string[];
  // Platform-specific options — each adapter casts to its own extension type
  platformOptions?: object;
}

export interface PublishResult {
  success: boolean;
  publishedLink?: string;
  errorMessage?: string;
}

// Credentials passed at call time — loaded from config_db, not injected at startup
export interface ProviderCredentials {
  [key: string]: string | undefined;
}

export interface IPublisherAdapter {
  readonly providerKey: string; // 'BUFFER' | 'PUBLER' | 'DIRECT'
  publish(payload: PublishPayload, platform: string, credentials: ProviderCredentials): Promise<PublishResult>;
  isConfigured(credentials: ProviderCredentials): boolean;
}
