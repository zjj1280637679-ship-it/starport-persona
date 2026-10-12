// 这不是密钥文件！这里只能存放公开的 Worker URL 和公开的 Turnstile Site Key。
// 生产上线：Cloudflare Worker 部署、配置私密 Secrets、通过测试后再填写这两个公共字段。
// 不得将 DeepSeek API Key、Turnstile Secret Key 填在本文件或任何静态网页中。
export const AI_CONFIG={
 endpoint:"",
 turnstileSiteKey:""
};
