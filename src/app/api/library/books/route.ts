import { crudCollection } from '@/server/crud';
import { bookConfig } from '@/server/resources/operations';

export const { GET, POST } = crudCollection(bookConfig);
