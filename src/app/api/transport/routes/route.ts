import { crudCollection } from '@/server/crud';
import { routeConfig } from '@/server/resources/operations';

export const { GET, POST } = crudCollection(routeConfig);
