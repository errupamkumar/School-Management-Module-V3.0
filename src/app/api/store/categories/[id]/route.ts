import { crudItem } from '@/server/crud';
import { categoryConfig } from '@/server/resources/operations';

export const { GET, PUT, DELETE } = crudItem(categoryConfig);
