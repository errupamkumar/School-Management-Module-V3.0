import { crudItem } from '@/server/crud';
import { hostelConfig } from '@/server/resources/hostel';

export const { GET, PUT, DELETE } = crudItem(hostelConfig);
