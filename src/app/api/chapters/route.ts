import { crudCollection } from '@/server/crud';
import { chapterConfig } from '@/server/resources/academics';

export const { GET, POST } = crudCollection(chapterConfig);
