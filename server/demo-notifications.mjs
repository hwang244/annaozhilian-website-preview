const INTERESTS = {demo: '预约产品演示', patient: '患者端咨询', expert: '专家端咨询',
  organization: '机构端咨询', partnership: '商务 / 机构合作', media: '媒体交流', careers: '人才交流'};

export function queueDemoNotification(context, id) {
  const recipient = String(context.env.DEMO_NOTIFY_EMAIL || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient || '') || !context.waitUntil) return;
  const db = context.env.DEMO_DB;
  const deliver = async requestId => {
    const now = Math.floor(Date.now() / 1000);
    const row = await db.prepare(`UPDATE demo_requests SET notification_state = 'sending',
      notification_attempts = notification_attempts + 1, notification_retry_at = ?1
      WHERE id = ?2 AND notification_state != 'sent' AND notification_retry_at <= ?3 RETURNING *`)
      .bind(now + 300, requestId, now).first();
    if (!row) return;
    try {
      const payload = {'_subject': `安脑智联官网 · ${INTERESTS[row.interest] || '新咨询'}`,
        '_template': 'table', '预约编号': row.id, '姓名': row.name, '联系电话': row.phone,
        '机构 / 公司': row.organization || '未填写', '咨询类型': INTERESTS[row.interest],
        '需求说明': row.message || '未填写', '提交时间（UTC）': row.created_at, '页面语言': row.language};
      if (row.email) payload.email = row.email;
      const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
        method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json',
          Origin: 'https://annobrain.com', Referer: 'https://annobrain.com/contact.html'},
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)});
      const result = await response.json();
      if (!response.ok || ![true, 'true'].includes(result.success)) {
        throw new Error(/activat/i.test(result.message || '') ? 'activation_required' : 'relay_unavailable');
      }
      await db.prepare(`UPDATE demo_requests SET notification_state = 'sent',
        notification_sent_at = ?1, notification_error = '' WHERE id = ?2`)
        .bind(new Date().toISOString(), requestId).run();
    } catch (error) {
      const code = error.message === 'activation_required' ? error.message : 'relay_unavailable';
      const retryAt = now + Math.min(3600, 60 * 2 ** Math.min(row.notification_attempts, 6));
      await db.prepare(`UPDATE demo_requests SET notification_state = 'pending',
        notification_error = ?1, notification_retry_at = ?2 WHERE id = ?3`)
        .bind(code, retryAt, requestId).run();
    }
  };
  // Sending happens after durable acceptance; another booking also retries one due notification.
  context.waitUntil((async () => {
    await deliver(id);
    const due = await db.prepare(`SELECT id FROM demo_requests WHERE notification_state IN ('pending', 'sending')
      AND notification_retry_at <= ?1 AND id != ?2 ORDER BY notification_retry_at LIMIT 1`)
      .bind(Math.floor(Date.now() / 1000), id).first();
    if (due) await deliver(due.id);
  })().catch(() => {}));
}
