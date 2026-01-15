/**
 * WeChat Message Routes
 * Feature: frontend-admin-ui
 * 
 * Handles WeChat official account message callbacks:
 * - Server verification (GET)
 * - Message/Event handling (POST)
 * - Bind via text message: "绑定 SCTxxx" or "订阅 TPKxxx"
 */

import { configService } from '../services/config.js';
import { bindingService } from '../modules/binding/service.js';
import { commandParser, CommandAction } from '../modules/binding/commands.js';
import { openidService, OpenIdSource } from '../modules/openid/service.js';
import { getUserInfo } from '../services/wechat.js';
import crypto from 'crypto';

/**
 * Register WeChat message routes
 * @param {import('@koa/router').default} router
 */
export function registerWeChatMsgRoutes(router) {
  /**
   * GET /wechat
   * WeChat server verification
   */
  router.get('/wechat', async (ctx) => {
    const { signature, timestamp, nonce, echostr } = ctx.query;

    const wechatConfig = await configService.getWeChatConfig();
    const token = wechatConfig?.msgToken || '';

    // Verify signature
    const arr = [token, timestamp, nonce].sort();
    const str = arr.join('');
    const hash = crypto.createHash('sha1').update(str).digest('hex');

    if (hash === signature) {
      ctx.body = echostr;
    } else {
      ctx.status = 403;
      ctx.body = 'Invalid signature';
    }
  });

  /**
   * POST /wechat
   * Handle WeChat messages and events
   */
  router.post('/wechat', async (ctx) => {
    const xml = ctx.request.body;
    
    // Parse XML (simple regex parsing for common fields)
    const msgType = extractXmlValue(xml, 'MsgType');
    const fromUser = extractXmlValue(xml, 'FromUserName');
    const toUser = extractXmlValue(xml, 'ToUserName');
    const content = extractXmlValue(xml, 'Content');
    const event = extractXmlValue(xml, 'Event');

    let replyContent = '';

    if (msgType === 'event') {
      // Handle events
      if (event === 'subscribe') {
        // User followed
        replyContent = await handleSubscribe(fromUser);
      } else if (event === 'unsubscribe') {
        // User unfollowed - no reply needed
        ctx.body = 'success';
        return;
      }
    } else if (msgType === 'text' && content) {
      // Handle text messages
      replyContent = await handleTextMessage(fromUser, content.trim());
    }

    if (replyContent) {
      ctx.type = 'application/xml';
      ctx.body = buildTextReply(toUser, fromUser, replyContent);
    } else {
      ctx.body = 'success';
    }
  });
}

/**
 * Handle subscribe event
 */
async function handleSubscribe(openId) {
  // Get user info and create OpenID record
  const userInfo = await getUserInfo(openId);
  
  let openIdRecord = await openidService.findByOpenId(openId);
  if (!openIdRecord) {
    openIdRecord = await openidService.create(openId, OpenIdSource.MESSAGE, userInfo?.nickname);
  } else if (userInfo?.nickname && !openIdRecord.name) {
    await openidService.update(openIdRecord.id, { name: userInfo.nickname });
  }

  return `欢迎关注！

您可以通过以下方式绑定消息推送：

1️⃣ 扫码绑定：在管理后台扫描 SendKey 或 Topic 的二维码

2️⃣ 消息绑定：
• 绑定 SendKey：发送 "绑定 SCTxxxxx"
• 订阅 Topic：发送 "订阅 TPKxxxxx"

绑定后即可接收消息推送通知。`;
}

/**
 * Handle text message for binding
 */
async function handleTextMessage(openId, content) {
  // Parse command using command parser
  const command = commandParser.parse(content);
  
  if (command) {
    const { action, key } = command;
    
    if (action === CommandAction.BIND) {
      return await handleBindSendKey(openId, key);
    }
    if (action === CommandAction.SUBSCRIBE) {
      return await handleSubscribeTopic(openId, key);
    }
    if (action === CommandAction.UNBIND) {
      return await handleUnbindSendKey(openId, key);
    }
    if (action === CommandAction.UNSUBSCRIBE) {
      return await handleUnsubscribeTopic(openId, key);
    }
  }

  // Help message for unrecognized commands
  if (content.includes('帮助') || content.toLowerCase() === 'help') {
    return `📖 使用帮助

${commandParser.getHelpMessage()}`;
  }

  return null; // No reply for other messages
}

/**
 * Handle SendKey binding via message
 */
async function handleBindSendKey(openId, key) {
  const result = await bindingService.bindToSendKeyByKey(openId, key, OpenIdSource.MESSAGE);
  
  if (!result.success) {
    if (result.error === 'KEY_NOT_FOUND') {
      return `❌ 绑定失败

未找到 SendKey: ${key}
请检查 Key 是否正确。`;
    }
    return `❌ 绑定失败

${result.error}`;
  }

  return `✅ 绑定成功

您已成功绑定到该 SendKey
现在可以接收消息推送了。`;
}

/**
 * Handle Topic subscription via message
 */
async function handleSubscribeTopic(openId, key) {
  const result = await bindingService.subscribeToTopicByKey(openId, key, OpenIdSource.MESSAGE);
  
  if (!result.success) {
    if (result.error === 'KEY_NOT_FOUND') {
      return `❌ 订阅失败

未找到 Topic: ${key}
请检查 Key 是否正确。`;
    }
    return `❌ 订阅失败

${result.error}`;
  }

  return `✅ 订阅成功

您已成功订阅该 Topic
现在可以接收该主题的消息推送了。`;
}

/**
 * Handle SendKey unbinding via message
 */
async function handleUnbindSendKey(openId, key) {
  const result = await bindingService.unbindFromSendKeyByKey(openId, key);
  
  if (!result.success) {
    if (result.error === 'KEY_NOT_FOUND') {
      return `❌ 解绑失败

未找到 SendKey: ${key}`;
    }
    if (result.error === 'NOT_BOUND') {
      return `❌ 解绑失败

您未绑定到该 SendKey。`;
    }
    return `❌ 解绑失败

${result.error}`;
  }

  return `✅ 解绑成功

您已从该 SendKey 解绑。`;
}

/**
 * Handle Topic unsubscription via message
 */
async function handleUnsubscribeTopic(openId, key) {
  const result = await bindingService.unsubscribeFromTopicByKey(openId, key);
  
  if (!result.success) {
    if (result.error === 'KEY_NOT_FOUND') {
      return `❌ 退订失败

未找到 Topic: ${key}`;
    }
    if (result.error === 'NOT_SUBSCRIBED') {
      return `❌ 退订失败

您未订阅该 Topic。`;
    }
    return `❌ 退订失败

${result.error}`;
  }

  return `✅ 退订成功

您已退订该 Topic。`;
}

/**
 * Extract value from XML string
 */
function extractXmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}>(.+?)</${tag}>`));
  return match ? (match[1] || match[2]) : null;
}

/**
 * Build text reply XML
 */
function buildTextReply(toUser, fromUser, content) {
  return `<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}
