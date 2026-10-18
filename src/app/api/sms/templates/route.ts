import { crudCollection } from '@/server/crud';
import { templateConfig } from '@/server/resources/comms';

export const { GET, POST } = crudCollection(templateConfig);
