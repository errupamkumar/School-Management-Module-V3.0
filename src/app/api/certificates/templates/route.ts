import { crudCollection } from '@/server/crud';
import { certificateTemplateConfig } from '@/server/resources/certificates';

export const { GET, POST } = crudCollection(certificateTemplateConfig);
