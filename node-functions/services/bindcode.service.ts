/**
 * BindCode Service - 绑定码管理
 * 
 * 绑定码格式：4位大写字母 + 4位数字（如 ABCD1234）
 * 排除易混淆字符：O、I（字母）和 0、1（数字）
 */

import { configKV } from '../shared/kv-client.js';
import type { BindCode, BindCodeStatus, CreateBindCodeInput } from '../types/bindcode.js';
import { BINDCODE_TTL_MS } from '../types/bindcode.js';
import { KVKeys, ApiError, ErrorCodes } from '../types/index.js';
import type { Channel } from '../types/channel.js';
import { wechatService } from './wechat.service.js';

// 可用字符（排除易混淆字符）
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // 排除 O, I
const DIGITS = '23456789';                    // 排除 0, 1

/**
 * 生成 8 位绑定码：4字母 + 4数字
 */
export function generateBindCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  for (let i = 0; i < 4; i++) {
    code += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  }
  return code;
}

/**
 * 验证绑定码格式
 */
export function isValidBindCodeFormat(code: string): boolean {
  if (!code || code.length !== 8) return false;
  
  const letterPart = code.substring(0, 4);
  const digitPart = code.substring(4, 8);
  
  // 检查前4位是否都是有效字母
  for (const char of letterPart) {
    if (!LETTERS.includes(char)) return false;
  }
  
  // 检查后4位是否都是有效数字
  for (const char of digitPart) {
    if (!DIGITS.includes(char)) return false;
  }
  
  return true;
}

/**
 * 检查绑定码是否过期
 */
export function isBindCodeExpired(bindCode: BindCode): boolean {
  return Date.now() > bindCode.expiresAt;
}

class BindCodeService {
  /**
   * 创建绑定码
   * @param input - 创建参数
   * @param channel - 可选，渠道配置（用于生成二维码）
   */
  async create(input: CreateBindCodeInput, channel?: Channel): Promise<BindCode> {
    const { appId, channelId } = input;
    
    const code = generateBindCode();
    const now = Date.now();
    const expireSeconds = Math.floor(BINDCODE_TTL_MS / 1000);
    
    const bindCode: BindCode = {
      code,
      appId,
      channelId,
      status: 'pending',
      createdAt: now,
      expiresAt: now + BINDCODE_TTL_MS,
    };
    
    // 尝试创建二维码（仅认证服务号可用）
    if (channel) {
      try {
        const qrResult = await wechatService.createQRCode(channel, code, expireSeconds);
        if (qrResult) {
          bindCode.qrCodeTicket = qrResult.ticket;
          bindCode.qrCodeUrl = wechatService.getQRCodeImageUrl(qrResult.ticket);
        }
      } catch (error) {
        // 创建二维码失败不影响绑定码生成（可能是订阅号或未认证服务号）
        // 静默失败
      }
    }
    
    // 存储到 KV，设置 TTL 为 10 分钟（比有效期长一些，便于查询过期状态）
    await configKV.put(KVKeys.BINDCODE(code), bindCode, 600);
    
    return bindCode;
  }
  
  /**
   * 根据绑定码获取记录
   */
  async get(code: string): Promise<BindCode | null> {
    const upperCode = code.toUpperCase();
    return configKV.get<BindCode>(KVKeys.BINDCODE(upperCode));
  }
  
  /**
   * 更新绑定状态为已绑定
   */
  async markAsBound(
    code: string,
    openId: string,
    nickname?: string,
    avatar?: string
  ): Promise<BindCode> {
    const bindCode = await this.get(code);
    
    if (!bindCode) {
      throw ApiError.notFound('绑定码不存在', ErrorCodes.BINDCODE_NOT_FOUND);
    }
    
    if (isBindCodeExpired(bindCode)) {
      throw ApiError.badRequest('绑定码已过期，请重新获取', ErrorCodes.BINDCODE_EXPIRED);
    }
    
    if (bindCode.status === 'bound') {
      throw ApiError.badRequest('绑定码已被使用', ErrorCodes.BINDCODE_INVALID);
    }
    
    const updatedBindCode: BindCode = {
      ...bindCode,
      status: 'bound',
      openId,
      nickname,
      avatar,
    };
    
    await configKV.put(KVKeys.BINDCODE(code.toUpperCase()), updatedBindCode, 600);
    
    return updatedBindCode;
  }
  
  /**
   * 获取绑定码状态（用于前端轮询）
   */
  async getStatus(code: string): Promise<{ status: BindCodeStatus; openId?: string; nickname?: string; avatar?: string }> {
    const bindCode = await this.get(code);
    
    if (!bindCode) {
      return { status: 'expired' };
    }
    
    if (isBindCodeExpired(bindCode) && bindCode.status === 'pending') {
      return { status: 'expired' };
    }
    
    if (bindCode.status === 'bound') {
      return {
        status: 'bound',
        openId: bindCode.openId,
        nickname: bindCode.nickname,
        avatar: bindCode.avatar,
      };
    }
    
    return { status: 'pending' };
  }
}

export const bindCodeService = new BindCodeService();
