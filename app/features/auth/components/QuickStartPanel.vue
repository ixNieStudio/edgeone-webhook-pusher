<template>
  <section class="surface-panel flex min-h-0 flex-col gap-3 p-5">
    <div class="text-app text-sm font-semibold">快速引导</div>
    <div class="space-y-2.5">
      <div class="surface-inset flex items-start gap-3 px-3.5 py-3">
        <span class="badge-base badge-cyan mt-0.5">01</span>
        <div class="min-w-0">
          <div class="text-app text-sm font-semibold">完成初始化或登录</div>
          <p class="mt-1 text-[13px] leading-5 text-subtle">管理员令牌只用于后台，不影响外部 send 接口。</p>
        </div>
      </div>
      <div class="surface-inset flex items-start gap-3 px-3.5 py-3">
        <span class="badge-base badge-cyan mt-0.5">02</span>
        <div class="min-w-0">
          <div class="text-app text-sm font-semibold">创建 webhook 应用</div>
          <p class="mt-1 text-[13px] leading-5 text-subtle">最快验证 send 链路和外部系统打通情况。</p>
        </div>
      </div>
      <div class="surface-inset flex items-start gap-3 px-3.5 py-3">
        <span class="badge-base badge-cyan mt-0.5">03</span>
        <div class="min-w-0">
          <div class="text-app text-sm font-semibold">按需接入认证能力</div>
          <p class="mt-1 text-[13px] leading-5 text-subtle">需要公众号或企业微信时，再补充认证配置。</p>
        </div>
      </div>
    </div>
  </section>
</template>
