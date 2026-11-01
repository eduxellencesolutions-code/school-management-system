export async function sendEmail({ to, subject, html, fromName, replyTo }: {
  to: string; subject: string; html: string; fromName?: string; replyTo?: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')
  const name = (fromName ?? 'Eduxellence Results').replace(/[<>"\r\n]/g, '').slice(0, 80)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${name} <notifications@eduxellence.org>`, to, subject, html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Resend API error (${res.status}): ${await res.text().catch(() => '')}`)
  return res.json()
}