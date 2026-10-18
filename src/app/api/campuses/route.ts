import { crudCollection } from '@/server/crud';
import { campusConfig } from '@/server/resources/campuses';

export const { GET, POST } = crudCollection(campusConfig);
