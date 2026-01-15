/**
 * WeChat Message Routes
 * 
 * GET /wechat - 微信服务器验证
 * POST /wechat - 处理微信消息和事件
 * 
 * 无需认证（微信回调）
 */

import Router from '@koa/router';
import crypto from 'crypto';
import type { AppContext } from '../types/context.js';
import { configService } from '../services/config.service.js';

const router = new Router();

/**
 * GET /wechat - 微信服务器验证
 */
router.get('/wechat', async (ctx: AppContext) => {
  const { signature, timestamp, nonce, echostr } = ctx.query;

  const wechatConfig = await configService.getWeChatConfig();
  // 注意：msgToken 需要在 SystemConfig 中添加，这里暂时使用空字符串
  const token = '';

  // 验证签名
  const arr = [token, timestamp as string, nonce as string].sort();
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
 * POST /wechat - 处理微信消息和事件
 */
router.post('/wechat', async (ctx: AppContext) => {
  const xml = ctx.request.body as string;

  // 解析 XML
  const msgType = extractXmlValue(xml, 'MsgType');
  const fromUser = extractXmlValue(xml, 'FromUserName');
  const toUser = extractXmlValue(xml, 'ToUserName');
  const content = extractXmlValue(xml, 'Content');
  const event = extractXmlValue(xml, 'Event');

  let replyContent = '';

  if (msgType === 'event') {
    // 处理事件
    if (event === 'subscribe') {
      // 用户关注
      replyContent = getWelcomeMessage();
    } else if (event === 'unsubscribe') {
      // 用户取消关注 - 不需要回复
      ctx.body = 'success';
      return;
    }
  } else if (msgType === 'text' && content) {
    // 处理文本消息
    replyContent = handleTextMessage(content.trim());
  }

  if (replyContent && toUser && fromUser) {
    ctx.type = 'application/xml';
    ctx.body = buildTextReply(toUser, fromUser, replyContent);
  } else {
    ctx.body = 'success';
  }
});

/**
 * 获取欢迎消息
 */
function getWelcomeMessage(): string {
  return `欢迎关注！

您可以通过管理后台添加 OpenID 来接收消息推送。`;
}

/**
 * 处理文本消息
 */
function handleTextMessage(content: string): string {
  // 帮助消息
  if (content.includes('帮助') || content.toLowerCase() === 'help') {
    return `📖 使用帮助

请通过管理后台添加您的 OpenID 来接收消息推送。`;
  }

  return ''; // 其他消息不回复
}

/**
 * 从 XML 字符串中提取值
 */
function extractXmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}>(.+?)</${tag}>`));
  return match ? (match[1] || match[2]) : null;
}

/**
 * 构建文本回复 XML
 */
function buildTextReply(toUser: string, fromUser: string, content: string): string {
  return `<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}

export default router;
