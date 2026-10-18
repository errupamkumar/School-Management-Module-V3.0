import { crudItem } from '@/server/crud';
import { campusConfig } from '@/server/resources/campuses';

export const { GET, PUT, DELETE } = crudItem(campusConfig);
