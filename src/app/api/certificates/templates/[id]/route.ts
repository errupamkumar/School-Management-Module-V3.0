import { crudItem } from '@/server/crud';
import { certificateTemplateConfig } from '@/server/resources/certificates';

export const { GET, PUT, DELETE } = crudItem(certificateTemplateConfig);
