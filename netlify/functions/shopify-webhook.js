exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    const email = (payload.email || '').toLowerCase().trim();
    const name = payload.firstName || payload.first_name || 'Beloved';
    const status = payload.status === 'cancelled' ? 'cancelled' : 'active';

    if (!email) {
      console.log('No email in payload:', JSON.stringify(payload));
      return { statusCode: 400, body: 'No email provided' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    const res = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        email,
        name,
        status,
        updated_at: new Date().toISOString()
      })
    });

    console.log(`Subscriber ${email} set to ${status}. Supabase: ${res.status}`);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('Webhook error:', err.message);
    return { statusCode: 500, body: 'Server error' };
  }
};
