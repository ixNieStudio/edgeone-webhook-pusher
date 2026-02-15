/**
 * WeChat Message Routes Tests
 * 
 * Property-based tests for bind command parsing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseBindCommand, extractXmlValue } from './wechat-msg.js';

// 有效字符集
const VALID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const VALID_DIGITS = '23456789';

/**
 * Property 3: 绑定消息解析正确性
 * Feature: wechat-user-binding, Property 3: 绑定消息解析正确性
 * Validates: Requirements 4.1
 */
describe('Property 3: 绑定消息解析正确性', () => {
  // 生成有效的绑定码
  const validBindCodeArb = fc.tuple(
    fc.array(fc.constantFrom(...VALID_LETTERS.split('')), { minLength: 4, maxLength: 4 }).map(arr => arr.join('')),
    fc.array(fc.constantFrom(...VALID_DIGITS.split('')), { minLength: 4, maxLength: 4 }).map(arr => arr.join(''))
  ).map(([letters, digits]) => letters + digits);

  it('有效的绑定消息应正确解析出绑定码', () => {
    fc.assert(
      fc.property(
        validBindCodeArb,
        fc.constantFrom('', ' ', '  ', '\t'),
        (code, space) => {
          const message = `绑定${space}${code}`;
          const result = parseBindCommand(message);
          expect(result).toBe(code.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('小写绑定码应转换为大写', () => {
    fc.assert(
      fc.property(
        validBindCodeArb,
        (code) => {
          const lowerCode = code.toLowerCase();
          const message = `绑定 ${lowerCode}`;
          const result = parseBindCommand(message);
          expect(result).toBe(code.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('混合大小写绑定码应转换为大写', () => {
    fc.assert(
      fc.property(
        validBindCodeArb,
        (code) => {
          // 随机混合大小写
          const mixedCode = code.split('').map((c, i) => 
            i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
          ).join('');
          const message = `绑定 ${mixedCode}`;
          const result = parseBindCommand(message);
          expect(result).toBe(code.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不符合格式的消息应返回 null', () => {
    const invalidMessages = [
      '',
      '绑定',
      '绑定 ',
      '绑定 ABC',
      '绑定 ABCD',
      '绑定 ABCD123',
      '绑定 ABCD12345',
      '绑定 1234ABCD',
      '绑定 ABCDABCD',
      '绑定 12341234',
      '你好',
      'hello',
      '帮助',
    ];

    for (const msg of invalidMessages) {
      expect(parseBindCommand(msg)).toBeNull();
    }
  });

  it('包含无效字符的绑定码应返回 null', () => {
    // 包含 O 或 I 的绑定码
    expect(parseBindCommand('绑定 ABCO2345')).toBeNull();
    expect(parseBindCommand('绑定 ABCI2345')).toBeNull();
    // 包含 0 或 1 的绑定码
    expect(parseBindCommand('绑定 ABCD0234')).toBeNull();
    expect(parseBindCommand('绑定 ABCD1234')).toBeNull();
  });

  it('空输入应返回 null', () => {
    expect(parseBindCommand('')).toBeNull();
    expect(parseBindCommand(null as unknown as string)).toBeNull();
    expect(parseBindCommand(undefined as unknown as string)).toBeNull();
  });

  it('前后有空格的消息应正确解析', () => {
    fc.assert(
      fc.property(
        validBindCodeArb,
        fc.constantFrom('', ' ', '  '),
        fc.constantFrom('', ' ', '  '),
        (code, prefix, suffix) => {
          const message = `${prefix}绑定 ${code}${suffix}`;
          const result = parseBindCommand(message);
          expect(result).toBe(code.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: 重复绑定检测
 * Feature: wechat-user-binding, Property 5: 重复绑定检测
 * Validates: Requirements 4.7
 * 
 * 注意：此测试验证解析逻辑的幂等性，实际重复检测在服务层实现
 */
describe('Property 5: 重复绑定检测（解析层）', () => {
  // 生成有效的绑定码
  const validBindCodeArb = fc.tuple(
    fc.array(fc.constantFrom(...VALID_LETTERS.split('')), { minLength: 4, maxLength: 4 }).map(arr => arr.join('')),
    fc.array(fc.constantFrom(...VALID_DIGITS.split('')), { minLength: 4, maxLength: 4 }).map(arr => arr.join(''))
  ).map(([letters, digits]) => letters + digits);

  it('相同绑定码多次解析应返回相同结果', () => {
    fc.assert(
      fc.property(
        validBindCodeArb,
        (code) => {
          const message = `绑定 ${code}`;
          
          const result1 = parseBindCommand(message);
          const result2 = parseBindCommand(message);
          
          expect(result1).toBe(result2);
          expect(result1).toBe(code.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: 过期绑定码拒绝（消息处理层）
 * Feature: wechat-user-binding, Property 4: 过期绑定码拒绝
 * Validates: Requirements 4.5
 * 
 * 注意：此测试验证消息处理逻辑对过期绑定码的处理
 * 实际过期检测逻辑在 bindcode.service.test.ts 中测试
 */
describe('Property 4: 过期绑定码拒绝（消息处理层）', () => {
  it('过期绑定码应被拒绝（通过 isBindCodeExpired 函数）', async () => {
    // 导入过期检测函数
    const { isBindCodeExpired } = await import('../services/bindcode.service.js');
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }), // 过期时间差（毫秒）
        (timeDiff) => {
          const now = Date.now();
          const expiredBindCode = {
            code: 'ABCD2345',
            appId: 'app_123',
            channelId: 'ch_456',
            status: 'pending' as const,
            createdAt: now - 300001 - timeDiff, // 超过 5 分钟
            expiresAt: now - timeDiff - 1, // 已过期
          };
          
          expect(isBindCodeExpired(expiredBindCode)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('未过期绑定码应被接受（通过 isBindCodeExpired 函数）', async () => {
    const { isBindCodeExpired } = await import('../services/bindcode.service.js');
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 299000 }), // 剩余时间（毫秒），1秒到4分59秒
        (remainingTime) => {
          const now = Date.now();
          const validBindCode = {
            code: 'ABCD2345',
            appId: 'app_123',
            channelId: 'ch_456',
            status: 'pending' as const,
            createdAt: now - (300000 - remainingTime),
            expiresAt: now + remainingTime,
          };
          
          expect(isBindCodeExpired(validBindCode)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * XML 解析测试
 * 验证微信消息 XML 解析正确性
 */
describe('XML 解析测试', () => {
  it('应正确解析 CDATA 格式的文本消息', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_123456]]></ToUserName>
      <FromUserName><![CDATA[oABC123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[绑定 ABCD2345]]></Content>
      <MsgId>1234567890123456</MsgId>
    </xml>`;

    expect(extractXmlValue(xml, 'ToUserName')).toBe('gh_123456');
    expect(extractXmlValue(xml, 'FromUserName')).toBe('oABC123');
    expect(extractXmlValue(xml, 'MsgType')).toBe('text');
    expect(extractXmlValue(xml, 'Content')).toBe('绑定 ABCD2345');
    expect(extractXmlValue(xml, 'CreateTime')).toBe('1348831860');
    expect(extractXmlValue(xml, 'MsgId')).toBe('1234567890123456');
  });

  it('应正确解析关注事件', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_123456]]></ToUserName>
      <FromUserName><![CDATA[oABC123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[event]]></MsgType>
      <Event><![CDATA[subscribe]]></Event>
    </xml>`;

    expect(extractXmlValue(xml, 'MsgType')).toBe('event');
    expect(extractXmlValue(xml, 'Event')).toBe('subscribe');
  });

  it('应正确解析带场景值的关注事件（扫码关注）', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_123456]]></ToUserName>
      <FromUserName><![CDATA[oABC123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[event]]></MsgType>
      <Event><![CDATA[subscribe]]></Event>
      <EventKey><![CDATA[qrscene_ABCD2345]]></EventKey>
    </xml>`;

    expect(extractXmlValue(xml, 'Event')).toBe('subscribe');
    expect(extractXmlValue(xml, 'EventKey')).toBe('qrscene_ABCD2345');
  });

  it('应正确解析 SCAN 事件（已关注用户扫码）', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_123456]]></ToUserName>
      <FromUserName><![CDATA[oABC123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[event]]></MsgType>
      <Event><![CDATA[SCAN]]></Event>
      <EventKey><![CDATA[ABCD2345]]></EventKey>
    </xml>`;

    expect(extractXmlValue(xml, 'Event')).toBe('SCAN');
    expect(extractXmlValue(xml, 'EventKey')).toBe('ABCD2345');
  });

  it('应正确解析取消关注事件', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_123456]]></ToUserName>
      <FromUserName><![CDATA[oABC123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[event]]></MsgType>
      <Event><![CDATA[unsubscribe]]></Event>
    </xml>`;

    expect(extractXmlValue(xml, 'Event')).toBe('unsubscribe');
  });

  it('不存在的标签应返回 null', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_123456]]></ToUserName>
    </xml>`;

    expect(extractXmlValue(xml, 'NotExist')).toBeNull();
    expect(extractXmlValue(xml, 'EventKey')).toBeNull();
  });

  it('应正确解析包含特殊字符的内容', () => {
    const xml = `<xml>
      <Content><![CDATA[你好！<>&"']]></Content>
    </xml>`;

    expect(extractXmlValue(xml, 'Content')).toBe("你好！<>&\"'");
  });
});
