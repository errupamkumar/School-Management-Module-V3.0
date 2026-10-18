import { crudItem } from '@/server/crud';
import { vehicleConfig } from '@/server/resources/operations';

export const { GET, PUT, DELETE } = crudItem(vehicleConfig);
