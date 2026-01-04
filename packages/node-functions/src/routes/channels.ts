import Router from '@koa/router';
import type { ChannelType } from '@webhook-pusher/shared';
import { ErrorCodes } from '@webhook-pusher/shared';
import { channelService } from '../services/channel.js';

const router = new Router();

/**
 * GET /api/channels - List all channels
 */
router.get('/', async (ctx) => {
  const channels = await channelService.getChannels(ctx.state.userId);

  // Mask sensitive credentials
  const maskedChannels = channels.map((c) => channelService.maskChannelCredentials(c));

  ctx.body = {
    code: 0,
    message: 'success',
    data: maskedChannels,
  };
});

/**
 * POST /api/channels - Create new channel
 */
router.post('/', async (ctx) => {
  const body = ctx.request.body as {
    type?: ChannelType;
    name?: string;
    credentials?: Record<string, string>;
  };

  if (!body.type || !body.name || !body.credentials) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_PARAM,
      message: 'Missing required fields: type, name, credentials',
    };
    return;
  }

  try {
    const channel = await channelService.createChannel(
      ctx.state.userId,
      body.type,
      body.name,
      body.credentials
    );

    ctx.status = 201;
    ctx.body = {
      code: 0,
      message: 'success',
      data: channelService.maskChannelCredentials(channel),
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_CHANNEL_CONFIG,
      message: String(error),
    };
  }
});

/**
 * GET /api/channels/:id - Get channel by ID
 */
router.get('/:id', async (ctx) => {
  const channel = await channelService.getChannel(ctx.state.userId, ctx.params.id);

  if (!channel) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.CHANNEL_NOT_FOUND,
      message: 'Channel not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: channelService.maskChannelCredentials(channel),
  };
});

/**
 * PUT /api/channels/:id - Update channel
 */
router.put('/:id', async (ctx) => {
  const body = ctx.request.body as {
    name?: string;
    enabled?: boolean;
    credentials?: Record<string, string>;
  };

  try {
    const channel = await channelService.updateChannel(ctx.state.userId, ctx.params.id, body);

    if (!channel) {
      ctx.status = 404;
      ctx.body = {
        code: ErrorCodes.CHANNEL_NOT_FOUND,
        message: 'Channel not found',
      };
      return;
    }

    ctx.body = {
      code: 0,
      message: 'success',
      data: channelService.maskChannelCredentials(channel),
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_CHANNEL_CONFIG,
      message: String(error),
    };
  }
});

/**
 * DELETE /api/channels/:id - Delete channel
 */
router.delete('/:id', async (ctx) => {
  const deleted = await channelService.deleteChannel(ctx.state.userId, ctx.params.id);

  if (!deleted) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.CHANNEL_NOT_FOUND,
      message: 'Channel not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
  };
});

export { router as channelsRouter };
