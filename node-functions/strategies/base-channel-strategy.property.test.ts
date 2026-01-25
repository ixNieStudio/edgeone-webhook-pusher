/**
 * BaseChannelStrategy 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel } from '../types/channel.js';
import type { PushMessage, SendResult, ChannelCapability } from './types.js';
import { ChannelCapability as ChannelCapabilityEnum } from './types.js';

// 创建一个测试用的具体策略类，用于追踪方法调用顺序
class OrderTrackingStrategy extends BaseChannelStrategy {
  public callOrder: string[] = [];
  public validateParamsCalled = false;

  getChannelCapability(): ChannelCapability {
    return ChannelCapabilityEnum.TOKEN_MANAGED;
  }

  protected validateParams(message: PushMessage): void {
    this.validateParamsCalled = true;
    this.callOrder.push('validateParams');
    super.validateParams(message);
  }

  protected async getAccessToken(): Promise<string> {
    this.callOrder.push('getAccessToken');
    return 'test-token';
  }

  protected buildMessage(message: PushMessage, target: string): any {
    this.callOrder.push('buildMessage');
    return {
      to: target,
      content: message.title,
    };
  }

  protected async sendRequest(_token: string, _messageBody: any): Promise<SendResult> {
    this.callOrder.push('sendRequest');
    return {
      success: true,
      msgId: 'test-msg-id',
    };
  }

  public resetCallOrder(): void {
    this.callOrder = [];
    this.validateParamsCalled = false;
  }
}

describe('BaseChannelStrategy Property Tests', () => {
  const mockChannel: Channel = {
    id: 'test-channel',
    name: 'Test Channel',
    type: 'wechat',
    config: {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  /**
   * 属性 14: 模板方法执行顺序
   * Feature: arch-redisign, Property 14: 模板方法执行顺序
   * 
   * 对于任何渠道策略的 send 方法调用，内部方法的执行顺序应该始终是：
   * validateParams → getAccessToken → buildMessage → sendRequest → parseResponse
   * 
   * **验证需求: 2.4**
   */
  describe('Property 14: 模板方法执行顺序', () => {
    // 生成有效的消息
    const validMessage = fc.record({
      title: fc.string({ minLength: 1 }),
      desp: fc.option(fc.string()),
      templateId: fc.option(fc.string()),
      templateData: fc.option(fc.dictionary(fc.string(), fc.anything())),
    });

    // 生成目标列表
    const targetList = fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 });

    it('应该始终按固定顺序执行模板方法步骤', async () => {
      await fc.assert(
        fc.asyncProperty(validMessage, targetList, async (message, targets) => {
          const strategy = new OrderTrackingStrategy(mockChannel);

          await strategy.send(message, targets);

          // 验证每个目标都执行了完整的流程
          const expectedCallsPerTarget = [
            'getAccessToken',
            'buildMessage',
            'sendRequest',
          ];

          // 验证 validateParams 在最开始被调用一次
          expect(strategy.validateParamsCalled).toBe(true);
          expect(strategy.callOrder[0]).toBe('validateParams');

          // 验证后续的调用顺序
          const callsAfterValidation = strategy.callOrder.slice(1);
          
          // 每个目标应该有 3 个调用（getAccessToken, buildMessage, sendRequest）
          expect(callsAfterValidation.length).toBe(targets.length * 3);

          // 验证每个目标的调用顺序
          for (let i = 0; i < targets.length; i++) {
            const offset = i * 3;
            expect(callsAfterValidation[offset]).toBe('getAccessToken');
            expect(callsAfterValidation[offset + 1]).toBe('buildMessage');
            expect(callsAfterValidation[offset + 2]).toBe('sendRequest');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('应该在参数校验失败时不调用其他方法', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => s.length === 0), // 空标题会导致校验失败
          targetList,
          async (emptyTitle, targets) => {
            const strategy = new OrderTrackingStrategy(mockChannel);
            const message: PushMessage = { title: emptyTitle };

            await expect(strategy.send(message, targets)).rejects.toThrow();

            // 验证只调用了 validateParams
            expect(strategy.validateParamsCalled).toBe(true);
            expect(strategy.callOrder).toEqual(['validateParams']);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应该为每个目标独立执行完整流程', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMessage,
          fc.integer({ min: 1, max: 10 }),
          async (message, targetCount) => {
            const strategy = new OrderTrackingStrategy(mockChannel);
            const targets = Array.from({ length: targetCount }, (_, i) => `target-${i}`);

            const result = await strategy.send(message, targets);

            // 验证结果数量
            expect(result.total).toBe(targetCount);
            expect(result.results).toHaveLength(targetCount);

            // 验证每个目标都有结果
            targets.forEach((target, index) => {
              expect(result.results[index].openId).toBe(target);
            });

            // 验证调用次数：1 次 validateParams + targetCount * 3 次其他方法
            expect(strategy.callOrder.length).toBe(1 + targetCount * 3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在单个目标失败时继续处理其他目标', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMessage,
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 0, max: 4 }),
          async (message, targetCount, failIndex) => {
            // 确保 failIndex 在有效范围内
            const actualFailIndex = failIndex % targetCount;
            
            let callCount = 0;
            class PartialFailStrategy extends OrderTrackingStrategy {
              protected async sendRequest(_token: string, _messageBody: any): Promise<SendResult> {
                this.callOrder.push('sendRequest');
                const currentCall = callCount++;
                
                if (currentCall === actualFailIndex) {
                  return {
                    success: false,
                    error: 'Simulated failure',
                  };
                }
                
                return {
                  success: true,
                  msgId: `msg-${currentCall}`,
                };
              }
            }

            const strategy = new PartialFailStrategy(mockChannel);
            const targets = Array.from({ length: targetCount }, (_, i) => `target-${i}`);

            const result = await strategy.send(message, targets);

            // 验证所有目标都被处理
            expect(result.total).toBe(targetCount);
            expect(result.results).toHaveLength(targetCount);
            expect(result.success).toBe(targetCount - 1);
            expect(result.failed).toBe(1);

            // 验证失败的目标
            expect(result.results[actualFailIndex].success).toBe(false);
            expect(result.results[actualFailIndex].error).toBe('Simulated failure');

            // 验证其他目标成功
            result.results.forEach((r, index) => {
              if (index !== actualFailIndex) {
                expect(r.success).toBe(true);
              }
            });

            // 验证所有目标都执行了完整流程
            expect(strategy.callOrder.length).toBe(1 + targetCount * 3);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应该在异常时继续处理其他目标', async () => {
      await fc.assert(
        fc.asyncProperty(
          validMessage,
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 0, max: 4 }),
          async (message, targetCount, throwIndex) => {
            // 确保 throwIndex 在有效范围内
            const actualThrowIndex = throwIndex % targetCount;
            
            let callCount = 0;
            class ThrowingStrategy extends OrderTrackingStrategy {
              protected async sendRequest(_token: string, _messageBody: any): Promise<SendResult> {
                this.callOrder.push('sendRequest');
                const currentCall = callCount++;
                
                if (currentCall === actualThrowIndex) {
                  throw new Error('Simulated exception');
                }
                
                return {
                  success: true,
                  msgId: `msg-${currentCall}`,
                };
              }
            }

            const strategy = new ThrowingStrategy(mockChannel);
            const targets = Array.from({ length: targetCount }, (_, i) => `target-${i}`);

            const result = await strategy.send(message, targets);

            // 验证所有目标都被处理
            expect(result.total).toBe(targetCount);
            expect(result.results).toHaveLength(targetCount);
            expect(result.success).toBe(targetCount - 1);
            expect(result.failed).toBe(1);

            // 验证抛出异常的目标
            expect(result.results[actualThrowIndex].success).toBe(false);
            expect(result.results[actualThrowIndex].error).toBe('Simulated exception');

            // 验证其他目标成功
            result.results.forEach((r, index) => {
              if (index !== actualThrowIndex) {
                expect(r.success).toBe(true);
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应该处理空目标列表', async () => {
      await fc.assert(
        fc.asyncProperty(validMessage, async (message) => {
          const strategy = new OrderTrackingStrategy(mockChannel);
          const targets: string[] = [];

          const result = await strategy.send(message, targets);

          // 验证结果
          expect(result.total).toBe(0);
          expect(result.success).toBe(0);
          expect(result.failed).toBe(0);
          expect(result.results).toHaveLength(0);

          // 验证只调用了 validateParams
          expect(strategy.validateParamsCalled).toBe(true);
          expect(strategy.callOrder).toEqual(['validateParams']);
        }),
        { numRuns: 50 }
      );
    });
  });
});
