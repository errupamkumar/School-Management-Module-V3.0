import { crudItem } from '@/server/crud';
import { productConfig } from '@/server/resources/operations';

export const { GET, PUT, DELETE } = crudItem(productConfig);
