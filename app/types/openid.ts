/**
 * OpenID 订阅者相关类型定义
 */

export interface OpenID {
  id: string;
  appId: string;
  openId: string;
  nickname?: string;
  avatar?: string;      // 用户头像 URL
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpenIDInput {
  openId: string;
  nickname?: string;
  avatar?: string;
  remark?: string;
}

export interface UpdateOpenIDInput {
  nickname?: string;
  avatar?: string;
  remark?: string;
}
