exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const payload = JSON.parse(event.body);

    // Shopify Flow sends customer email, name, and order info
    const email = (payload.email || payload.customer_email || '').toLowerCase().trim();
    const name = payload.first_name || payload.customer_first_name || 'Beloved';

    if (!email) {
      console.log('No email in payload:', JSON.stringify(payload));
      return { statusCode: 400, body: 'No email provided' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Add subscriber to Supabase
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
        status: 'active',
        updated_at: new Date().toISOString()
      })
    });

    console.log('Supabase response:', res.status, 'for email:', email);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('Shopify webhook error:', err.message);
    return { statusCode: 500, body: 'Server error' };
  }
};
