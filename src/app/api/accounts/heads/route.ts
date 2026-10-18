import { crudCollection } from '@/server/crud';
import { accountHeadConfig } from '@/server/resources/accounts';

export const { GET, POST } = crudCollection(accountHeadConfig);
