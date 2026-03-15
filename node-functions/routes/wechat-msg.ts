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
import { bindCodeService, isBindCodeExpired } from '../services/bindcode.service.js';
import { openidService } from '../services/openid.service.js';
import { appService } from '../services/app.service.js';
import { channelService } from '../services/channel.service.js';
import { wechatService } from '../services/wechat.service.js';
import { messageService } from '../services/message.service.js';
import { generateMessageId } from '../shared/utils.js';
import type { Message } from '../types/message.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router();

// 绑定消息正则：绑定 XXXX1234（不区分大小写，允许空格）
// 排除易混淆字符：O、I（字母）和 0、1（数字）
const BIND_COMMAND_REGEX = /^绑定\s*([A-HJ-NP-Za-hj-np-z]{4}[2-9]{4})$/;

/**
 * 解析绑定指令
 * @param content 消息内容
 * @returns 绑定码（大写）或 null
 */
export function parseBindCommand(content: string): string | null {
  if (!content) return null;
  const match = content.trim().match(BIND_COMMAND_REGEX);
  return match ? match[1].toUpperCase() : null;
}

/**
 * 验证微信签名
 */
function verifySignature(token: string, signature: string, timestamp: string, nonce: string): boolean {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const hash = crypto.createHash('sha1').update(str).digest('hex');
  return hash === signature;
}

/**
 * GET /wechat - 微信服务器验证（无渠道 ID，使用空 token）
 */
router.get('/wechat', async (ctx: AppContext) => {
  const { signature, timestamp, nonce, echostr } = ctx.query;
  
  // 无渠道 ID 时使用空 token（兼容旧配置）
  if (verifySignature('', signature as string, timestamp as string, nonce as string)) {
    ctx.body = echostr;
  } else {
    ctx.status = 403;
    ctx.body = 'Invalid signature';
  }
});

/**
 * GET /wechat/:channelId - 微信服务器验证（带渠道 ID）
 */
router.get('/wechat/:channelId', async (ctx: AppContext) => {
  const { channelId } = ctx.params;
  const { signature, timestamp, nonce, echostr } = ctx.query;
  
  // 获取渠道配置中的 token
  let token = '';
  try {
    const channel = await channelService.getById(channelId);
    if (channel && channel.type === 'wechat') {
      const wechatConfig = channel.config as any;
      if (wechatConfig?.msgToken) {
        token = wechatConfig.msgToken;
      }
    }
  } catch {
    // 获取失败时使用空 token
  }
  
  if (verifySignature(token, signature as string, timestamp as string, nonce as string)) {
    ctx.body = echostr;
  } else {
    ctx.status = 403;
    ctx.body = 'Invalid signature';
  }
});

/**
 * POST /wechat - 处理微信消息和事件（无渠道 ID）
 */
router.post('/wechat', async (ctx: AppContext) => {
  await handleWeChatMessage(ctx, undefined);
});

/**
 * POST /wechat/:channelId - 处理微信消息和事件（带渠道 ID）
 */
router.post('/wechat/:channelId', async (ctx: AppContext) => {
  const { channelId } = ctx.params;
  await handleWeChatMessage(ctx, channelId);
});

/**
 * 处理微信消息和事件
 */
async function handleWeChatMessage(ctx: AppContext, channelId?: string) {
  // 获取原始 XML 内容
  let xml: string;
  if (typeof ctx.request.body === 'string') {
    xml = ctx.request.body;
  } else if (ctx.request.body && typeof ctx.request.body === 'object') {
    // 如果 body 已经被解析成对象，尝试从 rawBody 获取
    xml = (ctx.request as any).rawBody || JSON.stringify(ctx.request.body);
  } else {
    xml = '';
  }
  
  // 解析 XML
  const msgType = extractXmlValue(xml, 'MsgType');
  const fromUser = extractXmlValue(xml, 'FromUserName');
  const toUser = extractXmlValue(xml, 'ToUserName');
  const content = extractXmlValue(xml, 'Content');
  const event = extractXmlValue(xml, 'Event');
  const eventKey = extractXmlValue(xml, 'EventKey');

  let replyContent = '';

  if (msgType === 'event') {
    // 处理事件
    if (event === 'subscribe') {
      // 用户关注
      if (channelId && fromUser) {
        void saveInboundMessage({
          channelId,
          openId: fromUser,
          type: 'event',
          event: eventKey ? `subscribe:${eventKey}` : 'subscribe',
          title: '用户关注',
          desp: eventKey ? `场景值: ${eventKey}` : undefined,
        });
      }
      
      // 检查是否是扫码关注（带场景值）
      if (eventKey && fromUser) {
        const sceneValue = eventKey.replace(/^qrscene_/, '');
        if (sceneValue && sceneValue !== eventKey) {
          replyContent = await handleScanBind(sceneValue, fromUser, channelId);
        } else {
          replyContent = getWelcomeMessage();
        }
      } else {
        replyContent = getWelcomeMessage();
      }
    } else if (event === 'unsubscribe') {
      // 用户取消关注（不回复）
      if (channelId && fromUser) {
        void saveInboundMessage({
          channelId,
          openId: fromUser,
          type: 'event',
          event: 'unsubscribe',
          title: '用户取消关注',
        });
      }
      ctx.body = 'success';
      return;
    } else if (event === 'SCAN' && eventKey && fromUser) {
      // 已关注用户扫码
      if (channelId && fromUser) {
        void saveInboundMessage({
          channelId,
          openId: fromUser,
          type: 'event',
          event: `SCAN:${eventKey}`,
          title: '用户扫码',
          desp: `场景值: ${eventKey}`,
        });
      }
      replyContent = await handleScanBind(eventKey, fromUser, channelId);
    } else {
      // 其他事件
      if (channelId && fromUser) {
        void saveInboundMessage({
          channelId,
          openId: fromUser,
          type: 'event',
          event: event || 'unknown',
          title: `事件: ${event || 'unknown'}`,
          desp: eventKey ? `EventKey: ${eventKey}` : undefined,
        });
      }
      replyContent = '收到';
    }
  } else if (msgType === 'text' && content && fromUser) {
    // 保存文本消息
    if (channelId) {
      void saveInboundMessage({
        channelId,
        openId: fromUser,
        type: 'text',
        title: content.length > 50 ? content.substring(0, 50) + '...' : content,
        desp: content,
      });
    }
    
    // 处理文本消息
    const textReply = await handleTextMessage(content.trim(), fromUser, channelId);
    replyContent = textReply || '收到';
  } else if (msgType && fromUser) {
    // 其他类型消息（图片、语音、视频等）
    if (channelId) {
      void saveInboundMessage({
        channelId,
        openId: fromUser,
        type: 'text',
        title: `${msgType}消息`,
        desp: `收到${msgType}类型消息`,
      });
    }
    replyContent = '收到';
  }

  // 确保始终有回复
  if (!replyContent) {
    replyContent = '收到';
  }

  if (toUser && fromUser) {
    ctx.type = 'application/xml';
    // 回复时交换发送者和接收者：ToUserName 是用户，FromUserName 是公众号
    ctx.body = buildTextReply(fromUser, toUser, replyContent);
  } else {
    // 无法构建回复时返回 success
    ctx.body = 'success';
  }
}

/**
 * 保存收到的消息
 */
async function saveInboundMessage(params: {
  channelId: string;
  openId: string;
  type: 'text' | 'event';
  event?: string;
  title: string;
  desp?: string;
}): Promise<void> {
  try {
    const message: Message = {
      id: generateMessageId(),
      direction: 'inbound',
      type: params.type,
      channelId: params.channelId,
      openId: params.openId,
      title: params.title,
      desp: params.desp,
      event: params.event,
      createdAt: new Date().toISOString(),
    };
    await messageService.saveMessage(message);
  } catch (error) {
    // 保存失败不影响消息处理
    if (process.env.DEBUG_KV_URL === 'true') {
      console.error('[WeChat] Failed to save inbound message:', error);
    }
  }
}

/**
 * 获取欢迎消息
 */
function getWelcomeMessage(): string {
  return `🎉 欢迎关注！

如需绑定应用接收消息推送，请发送：
绑定 XXXX1234

（绑定码请从管理后台获取）`;
}

/**
 * 处理文本消息
 */
async function handleTextMessage(content: string, openId: string, channelId?: string): Promise<string> {
  // 检查是否是绑定指令
  const bindCode = parseBindCommand(content);
  if (bindCode) {
    return await handleBindCommand(bindCode, openId, channelId);
  }

  // 帮助消息
  if (content.includes('帮助') || content.toLowerCase() === 'help') {
    return `📖 使用帮助

如需绑定应用接收消息推送，请发送：
绑定 XXXX1234

（绑定码请从管理后台获取）`;
  }

  return ''; // 其他消息不回复
}

/**
 * 处理绑定指令
 */
async function handleBindCommand(code: string, openId: string, channelId?: string): Promise<string> {
  return await performBind(code, openId, channelId);
}

/**
 * 处理扫码绑定
 */
async function handleScanBind(sceneStr: string, openId: string, channelId?: string): Promise<string> {
  // 验证场景值是否是有效的绑定码格式
  const code = sceneStr.toUpperCase();
  if (!/^[A-HJ-NP-Z]{4}[2-9]{4}$/.test(code)) {
    // 不是绑定码格式，可能是其他场景值，返回欢迎消息
    return getWelcomeMessage();
  }
  
  return await performBind(code, openId, channelId);
}

/**
 * 执行绑定操作
 */
async function performBind(code: string, openId: string, channelId?: string): Promise<string> {
  try {
    // 获取绑定码
    const bindCodeRecord = await bindCodeService.get(code);
    
    if (!bindCodeRecord) {
      return '❌ 绑定码无效，请检查后重试';
    }

    // 检查是否过期
    if (isBindCodeExpired(bindCodeRecord)) {
      return '❌ 绑定码已过期，请重新获取';
    }

    // 检查绑定码是否已被使用
    if (bindCodeRecord.status === 'bound') {
      return '❌ 该绑定码已被使用';
    }

    // 如果有渠道 ID，验证是否匹配
    if (channelId && bindCodeRecord.channelId !== channelId) {
      return '❌ 绑定码与当前公众号不匹配';
    }

    const { appId } = bindCodeRecord;

    // 获取应用信息
    const app = await appService.getById(appId);
    if (!app) {
      return '❌ 应用不存在';
    }

    // 获取渠道信息以获取用户详情
    const channel = await channelService.getById(bindCodeRecord.channelId);
    let nickname: string | undefined;
    let avatar: string | undefined;

    if (channel) {
      try {
        // 用户资料查询设置超时，避免阻塞微信回调
        const userInfo = await Promise.race([
          wechatService.getUserInfo(channel, openId),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
        ]);
        if (userInfo) {
          nickname = userInfo.nickname;
          avatar = userInfo.avatar;
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
        // 获取用户信息失败不阻止绑定
      }
    }

    // 创建 OpenID 记录
    try {
      await openidService.create(
        appId,
        {
          openId,
          nickname,
          avatar,
        },
        {
          // 应用已在当前流程校验过，避免重复 KV 读取
          skipAppValidation: true,
        }
      );
    } catch (error) {
      // 幂等处理：重复绑定快速返回成功提示
      if (error instanceof ApiError && error.code === ErrorCodes.ALREADY_SUBSCRIBED) {
        return '✅ 您已绑定该应用，无需重复绑定';
      }
      throw error;
    }

    // 更新绑定码状态
    await bindCodeService.markAsBound(code, openId, nickname, avatar);

    return `✅ 绑定成功！

您已成功绑定应用「${app.name}」，后续将通过此公众号接收消息推送。`;
  } catch (error) {
    console.error('Bind error:', error);
    return '❌ 绑定失败，请稍后重试';
  }
}

/**
 * 从 XML 字符串中提取值
 */
export function extractXmlValue(xml: string, tag: string): string | null {
  if (!xml || typeof xml !== 'string') return null;
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
