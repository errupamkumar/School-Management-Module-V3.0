import { publicRoute } from '@/server/api';
import { ingestDevicePosition } from '@/server/services/tracking-ingest';

/** GPS hardware posting to a per-vehicle secret URL. */
const handler = publicRoute({ name: 'tracking', limit: 3000, windowSec: 600 }, (req, params) => ingestDevicePosition(req, params.token));
export const GET = handler;
export const POST = handler;
