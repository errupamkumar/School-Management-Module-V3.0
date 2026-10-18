import { crudItem } from '@/server/crud';
import { eventConfig } from '@/server/resources/comms';

export const { GET, PUT, DELETE } = crudItem(eventConfig);
