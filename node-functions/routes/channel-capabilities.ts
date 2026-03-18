/**
 * Channel capability matrix for the app-first admin console.
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { adminAuth } from '../middleware/admin-auth.js';

const router = new Router({ prefix: '/channel-capabilities' });

router.use(adminAuth);

router.get('/', async (ctx: AppContext) => {
  ctx.body = {
    wechat: {
      connectionModes: ['auth_profile_ref'],
      sendTypes: ['text', 'page'],
      supportsPublicDetailPage: true,
      requiresBinding: true,
    },
    work_wechat: {
      connectionModes: ['auth_profile_ref'],
      sendTypes: ['text', 'page'],
      requiresBinding: false,
      recipientModes: ['fixed_targets'],
    },
    dingtalk: {
      connectionModes: ['inline_webhook'],
      renderers: ['text', 'markdown', 'card'],
      requiresBinding: false,
    },
    feishu: {
      connectionModes: ['inline_webhook'],
      renderers: ['text', 'markdown', 'card'],
      requiresBinding: false,
    },
  };
});

export default router;
