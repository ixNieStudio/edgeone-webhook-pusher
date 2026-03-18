/**
 * App-first setup overview route.
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { appOrchestratorService } from '../services/app-orchestrator.service.js';

const router = new Router({ prefix: '/setup' });

router.use(adminAuth);

router.get('/overview', async (ctx: AppContext) => {
  ctx.body = await appOrchestratorService.getSetupOverview();
});

export default router;
