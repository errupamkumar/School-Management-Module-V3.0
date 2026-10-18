import { crudCollection } from '@/server/crud';
import { periodConfig } from '@/server/resources/timetable';

export const { GET, POST } = crudCollection(periodConfig);
