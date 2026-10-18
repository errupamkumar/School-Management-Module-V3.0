import { crudCollection } from '@/server/crud';
import { roomConfig } from '@/server/resources/hostel';

export const { GET, POST } = crudCollection(roomConfig);
