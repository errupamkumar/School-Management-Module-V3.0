import { crudCollection } from '@/server/crud';
import { vehicleConfig } from '@/server/resources/operations';

export const { GET, POST } = crudCollection(vehicleConfig);
