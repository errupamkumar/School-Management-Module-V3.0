import { crudItem } from '@/server/crud';
import { feeHeadConfig } from '@/server/resources/fees';

export const { GET, PUT, DELETE } = crudItem(feeHeadConfig);
