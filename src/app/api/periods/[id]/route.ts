import { crudItem } from '@/server/crud';
import { periodConfig } from '@/server/resources/timetable';

export const { GET, PUT, DELETE } = crudItem(periodConfig);
