import { crudItem } from '@/server/crud';
import { assetConfig } from '@/server/resources/operations';

export const { GET, PUT, DELETE } = crudItem(assetConfig);
