import { crudCollection } from '@/server/crud';
import { subjectConfig } from '@/server/resources/academics';

export const { GET, POST } = crudCollection(subjectConfig);
