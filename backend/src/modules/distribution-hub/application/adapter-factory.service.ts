import { Injectable } from '@nestjs/common';
import { IPublisherAdapter } from '../domain/adapters/publisher.adapter.interface';
import { BufferAdapter } from '../infrastructure/buffer.adapter';
import { DirectAdapter } from '../infrastructure/direct.adapter';

@Injectable()
export class AdapterFactory {
  constructor(
    private readonly bufferAdapter: BufferAdapter,
    private readonly directAdapter: DirectAdapter,
  ) {}

  resolve(providerKey: string): IPublisherAdapter {
    switch (providerKey) {
      case 'BUFFER':
        return this.bufferAdapter;
      case 'DIRECT':
        return this.directAdapter;
      default:
        throw new Error(`Unknown provider key: ${providerKey}`);
    }
  }
}
