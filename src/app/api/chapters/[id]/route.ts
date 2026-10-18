import { crudItem } from '@/server/crud';
import { chapterConfig } from '@/server/resources/academics';

export const { GET, PUT, DELETE } = crudItem(chapterConfig);
