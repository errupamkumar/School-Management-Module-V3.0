import { crudCollection } from '@/server/crud';
import { feeHeadConfig } from '@/server/resources/fees';

export const { GET, POST } = crudCollection(feeHeadConfig);
