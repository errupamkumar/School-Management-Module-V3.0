import { crudItem } from '@/server/crud';
import { questionConfig } from '@/server/resources/questions';

export const { GET, PUT, DELETE } = crudItem(questionConfig);
