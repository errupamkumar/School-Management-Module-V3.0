import { crudItem } from '@/server/crud';
import { bookConfig } from '@/server/resources/operations';

export const { GET, PUT, DELETE } = crudItem(bookConfig);
