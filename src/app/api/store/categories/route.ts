import { crudCollection } from '@/server/crud';
import { categoryConfig } from '@/server/resources/operations';

export const { GET, POST } = crudCollection(categoryConfig);
