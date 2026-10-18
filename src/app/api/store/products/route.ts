import { crudCollection } from '@/server/crud';
import { productConfig } from '@/server/resources/operations';

export const { GET, POST } = crudCollection(productConfig);
