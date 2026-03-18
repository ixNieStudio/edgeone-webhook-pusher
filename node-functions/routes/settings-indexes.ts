import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError } from '../types/api.js';
import { adminIndexService } from '../services/admin-index.service.js';

const router = new Router({ prefix: '/settings/indexes' });

router.use(adminAuth);

router.post('/repair', async (ctx: AppContext) => {
  const body = ctx.request.body as { domain?: 'apps' | 'auth_profiles' | 'all' } | undefined;
  const domain = body?.domain || 'all';

  if (!['apps', 'auth_profiles', 'all'].includes(domain)) {
    throw ApiError.badRequest('domain must be one of: apps, auth_profiles, all');
  }

  await adminIndexService.repair(domain, 'manual');
  ctx.body = {
    indexes: await adminIndexService.getIndexStatus(),
  };
});

export default router;
