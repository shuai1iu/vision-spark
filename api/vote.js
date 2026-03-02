// 投票接口 — 使用 Supabase，原子递增/递减
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { id, action } = req.body; // action: 'up' | 'down'
  if (!id) return res.status(400).json({ error: 'ID required' });

  try {
    // 先读再写保证不低于 0（Supabase anon key 通常没有 RPC 权限，用 select + update）
    const { data: row, error: fetchErr } = await supabase
      .from('inspirations')
      .select('votes')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const currentVotes = row?.votes ?? 0;
    const delta = action === 'down' ? -1 : 1;
    const newVotes = Math.max(0, currentVotes + delta);

    const { error: updateErr } = await supabase
      .from('inspirations')
      .update({ votes: newVotes })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return res.status(200).json({ votes: newVotes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
