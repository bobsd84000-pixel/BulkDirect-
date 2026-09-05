export async function POST(req) {
  const body = await req.json();
  const { qualified_leads } = body || {};
  const format = req.query?.format || 'json';

  if (!Array.isArray(qualified_leads)) {
    return new Response(
      JSON.stringify({ error: 'qualified_leads must be an array' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Exporting ${qualified_leads.length} leads as ${format}...`);

  if (format === 'csv') {
    return handleCSV(qualified_leads);
  } else if (format === 'webhook') {
    return handleWebhook(qualified_leads);
  } else {
    return handleJSON(qualified_leads);
  }
}

function handleJSON(qualified_leads) {
  const filename = generateFilename('json');
  const response = {
    status: 'exported',
    format: 'json',
    filename,
    count: qualified_leads.length,
    data: qualified_leads,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function handleCSV(qualified_leads) {
  const headers = ['post_id', 'title', 'score', 'email', 'business', 'intent', 'url'];
  const rows = qualified_leads.map(lead => [
    lead.post_id,
    `"${(lead.title || '').replace(/"/g, '""')}"`,
    lead.score,
    lead.email || '',
    lead.business || '',
    lead.intent || '',
    lead.url || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = generateFilename('csv');

  const response = {
    status: 'exported',
    format: 'csv',
    filename,
    count: qualified_leads.length,
    csv_preview: csv.split('\n').slice(0, 3).join('\n'),
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleWebhook(qualified_leads) {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!webhookUrl) {
    return new Response(
      JSON.stringify({
        status: 'webhook_skipped',
        message: 'WEBHOOK_URL not configured',
        count: qualified_leads.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      count: qualified_leads.length,
      leads: qualified_leads,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const status = response.ok ? 'success' : 'failed';
    console.log(`Webhook sent to ${webhookUrl}: ${status}`);

    return new Response(
      JSON.stringify({
        status: 'webhook_sent',
        webhook_status: response.status,
        webhook_status_text: response.statusText,
        count: qualified_leads.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Webhook error:', err.message);
    return new Response(
      JSON.stringify({
        status: 'webhook_error',
        error: err.message,
        count: qualified_leads.length,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function generateFilename(ext) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  return `leads-${date}.${ext}`;
}
