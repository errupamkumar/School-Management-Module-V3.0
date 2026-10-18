import { publicRoute } from '@/server/api';
import { ingestDevicePosition } from '@/server/services/tracking-ingest';

/**
 * Traccar Client / OsmAnd style: set the app's server URL to this endpoint and
 * its device identifier to the vehicle's tracking token.
 */
const handler = publicRoute({ name: 'tracking', limit: 3000, windowSec: 600 }, (req) => ingestDevicePosition(req));
export const GET = handler;
export const POST = handler;
