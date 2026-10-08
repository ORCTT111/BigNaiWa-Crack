/* ============================================================
 *  Service Worker 注册
 *
 *  只在 http(s) 下注册：
 *    · file:// 协议（直接双击 HTML 打开）不支持 SW，跳过即可
 *    · 本地静态服务 http://localhost 属于安全上下文，可以注册
 *  注册失败一律吞掉 —— 离线能力是加分项，绝不能影响能不能玩。
 * ============================================================ */
(function () {
  'use strict';

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  var proto = location.protocol;
  if (proto !== 'http:' && proto !== 'https:') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      /* 发现新版本时，下一次进入页面就会用上 */
      if (reg && reg.update) {
        try { reg.update(); } catch (e) { /* 忽略 */ }
      }
    }).catch(function () {
      /* 隐身模式 / 被策略拦截 / 非安全上下文：静默跳过 */
    });
  });
})();
