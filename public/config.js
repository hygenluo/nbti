// 生产环境配置：部署到静态托管时，前端直连 Supabase
// 本地 localhost/127.0.0.1 运行时自动走 Express 后端，不读这里
window.NBTI_CONFIG = {
  SUPABASE_URL: '',   // 形如 https://xxxx.supabase.co
  SUPABASE_KEY: '',   // sb_publishable_xxx（可公开，靠 RLS 保护）
};
