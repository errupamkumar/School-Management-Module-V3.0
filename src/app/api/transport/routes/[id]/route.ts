import { crudItem } from '@/server/crud';
import { routeConfig } from '@/server/resources/operations';

export const { GET, PUT, DELETE } = crudItem(routeConfig);
