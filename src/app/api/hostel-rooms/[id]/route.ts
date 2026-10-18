import { crudItem } from '@/server/crud';
import { roomConfig } from '@/server/resources/hostel';

export const { GET, PUT, DELETE } = crudItem(roomConfig);
