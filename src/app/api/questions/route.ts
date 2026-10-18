import { crudCollection } from '@/server/crud';
import { questionConfig } from '@/server/resources/questions';

export const { GET, POST } = crudCollection(questionConfig);
