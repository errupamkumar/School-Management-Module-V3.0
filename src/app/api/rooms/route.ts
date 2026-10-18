import { crudCollection } from '@/server/crud';
import { roomConfig } from '@/server/resources/timetable';

export const { GET, POST } = crudCollection(roomConfig);
