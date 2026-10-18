import { crudCollection } from '@/server/crud';
import { assetConfig } from '@/server/resources/operations';

export const { GET, POST } = crudCollection(assetConfig);
