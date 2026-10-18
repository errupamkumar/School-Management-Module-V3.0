import { crudItem } from '@/server/crud';
import { templateConfig } from '@/server/resources/comms';

export const { GET, PUT, DELETE } = crudItem(templateConfig);
