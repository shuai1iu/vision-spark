// 灵感条目 CRUD — 使用 Supabase（inspirations 表）
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/entries — 获取所有条目，按创建时间降序
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('inspirations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // 转换字段名以兼容前端现有格式
      const entries = (data || []).map(row => ({
        id: row.id,
        type: row.type || 'link',
        title: row.title,
        url: row.source_url || '',
        thumb: row.thumbnail_url || '',
        note: row.note || row.ai_summary || '',
        platform: (row.platform_tags || [])[0] || '其他',
        tags: row.tech_tags || [],
        diff: row.difficulty || 3,
        votes: row.votes || 0,
        created_at: row.created_at,
        // 扩展字段
        ai_summary: row.ai_summary || '',
        style_tags: row.style_tags || [],
        workflow: row.workflow || [],
      }));

      return res.status(200).json(entries);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/entries — 新建条目
  if (req.method === 'POST') {
    try {
      const entry = req.body;
      if (!entry || !entry.title) return res.status(400).json({ error: 'Invalid entry: title required' });

      // 将前端格式映射到数据库 schema
      const payload = {
        id: entry.id || crypto.randomUUID(),
        title: entry.title,
        type: entry.type || 'link',
        source_url: entry.url || null,
        thumbnail_url: entry.thumb || null,
        // 注意：fileData（base64）不存数据库，太大了；仅存 localStorage
        note: entry.note || null,
        ai_summary: null,
        tech_tags: entry.tags || [],
        style_tags: [],
        platform_tags: entry.platform ? [entry.platform] : [],
        difficulty: entry.diff || 3,
        votes: 0,
        workflow: [],
        created_by: 'anonymous',
      };

      const { error } = await supabase.from('inspirations').insert(payload);
      if (error) throw error;

      return res.status(200).json({ ok: true, id: payload.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/entries?id=xxx
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });

      const { error } = await supabase.from('inspirations').delete().eq('id', id);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
