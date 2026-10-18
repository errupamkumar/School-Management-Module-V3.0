import { crudCollection } from '@/server/crud';
import { hostelConfig } from '@/server/resources/hostel';

export const { GET, POST } = crudCollection(hostelConfig);
