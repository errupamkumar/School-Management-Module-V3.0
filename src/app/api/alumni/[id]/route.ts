import { crudItem } from '@/server/crud';
import { alumniConfig } from '@/server/resources/alumni';

export const { GET, PUT, DELETE } = crudItem(alumniConfig);
