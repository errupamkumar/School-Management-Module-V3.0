import { crudCollection } from '@/server/crud';
import { alumniConfig } from '@/server/resources/alumni';

export const { GET, POST } = crudCollection(alumniConfig);
