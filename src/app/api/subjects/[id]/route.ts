import { crudItem } from '@/server/crud';
import { subjectConfig } from '@/server/resources/academics';

export const { GET, PUT, DELETE } = crudItem(subjectConfig);
