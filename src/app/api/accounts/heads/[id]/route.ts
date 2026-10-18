import { crudItem } from '@/server/crud';
import { accountHeadConfig } from '@/server/resources/accounts';

export const { GET, DELETE } = crudItem(accountHeadConfig);
