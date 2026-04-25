export enum JobName {
  SCRAPE_PRODUCT = 'scrape_product',
  IMPORT_CSV = 'import_csv',
  ENRICH_PRODUCT = 'enrich_product',
  GENERATE_CONTENT = 'generate_content',
  PUBLISH_CONTENT = 'publish_content',
  PROCESS_VIDEO = 'process_video',
}

export const QUEUE_NAMES = {
  PRODUCT_INGESTION: 'product-ingestion',
  PRODUCT_ENRICHMENT: 'product-enrichment',
  CONTENT_GENERATION: 'content-generation',
  DISTRIBUTION: 'distribution',
  VIDEO_PROCESSING: 'video-processing',
} as const;
