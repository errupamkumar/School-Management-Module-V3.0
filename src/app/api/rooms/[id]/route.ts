import { crudItem } from '@/server/crud';
import { roomConfig } from '@/server/resources/timetable';

export const { GET, PUT, DELETE } = crudItem(roomConfig);
