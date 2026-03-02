// AI 分析接口 — 使用 Gemini API（安全：key 在后端，不暴露给客户端）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const ALL_TAGS = ['AI生成','风格迁移','肢体识别','面部识别','手势识别','背景替换','粒子特效','光影特效','AR叠加','3D追踪','镜头运镜','音频驱动','互动玩法','合拍/分屏'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const prompt = `你是一名专业的短视频特效产品经理，专门分析海外视觉特效产品。

请分析这个URL对应的产品/功能：${url}

根据URL的域名、路径和你对这个产品的了解，判断它是什么特效或视觉玩法。严格按以下JSON格式输出，不输出任何其他内容：

{
  "title": "用15字以内的中文描述核心功能，要具体有料，不用模糊词",
  "note": "2-3句话描述亮点、用户体验特点、以及对团队的参考价值",
  "platform": "从以下选一个：TikTok/Instagram/YouTube/Snapchat/BeReal/其他",
  "tags": ["从以下选1-3个最匹配的：${ALL_TAGS.join('/')}"],
  "difficulty": 1到5的整数（1=简单纯前端，2=需少量模型，3=多模型协作，4=需实时推理优化，5=业界顶尖），
  "difficultyReason": "一句话说明技术瓶颈"
}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    // 提取生成文本
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
