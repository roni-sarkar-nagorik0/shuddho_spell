/** GET as well as POST, one statement each — see `../notifications/route.ts`. */
export { examAutoSubmitCronHandler as POST } from '@/composition/handlers';
export { examAutoSubmitCronHandler as GET } from '@/composition/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A backstop that finishes and marks every abandoned attempt it finds. The
 * batch is normally empty and occasionally is not, and the occasional one is
 * exactly the run that must not be cut off half way.
 */
export const maxDuration = 60;
