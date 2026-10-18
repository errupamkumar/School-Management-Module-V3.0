import { crudCollection } from '@/server/crud';
import { academicYearConfig } from '@/server/resources/academics';

export const { GET, POST } = crudCollection(academicYearConfig);
