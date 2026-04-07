const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  console.log('=== check-access function started ===');

  try {
    const body = JSON.parse(event.body);
    const email = body.email;
    console.log('Email received:', email);

    if (!email) {
      console.log('ERROR: No email provided');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
    }

    const store = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_ACCESS_TOKEN;

    console.log('Store:', store);
    console.log('Token present:', !!token);

    if (!store || !token) {
      console.log('ERROR: Missing environment variables');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error - missing env vars' }) };
    }

    const url = `https://${store}/admin/api/2025-07/customers/search.json?query=email:${encodeURIComponent(email)}&fields=id,email,first_name,tags`;
    console.log('Calling Shopify URL:', url);

    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });

    console.log('Shopify response status:', res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.log('Shopify error response:', errText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to reach Shopify', status: res.status }) };
    }

    const data = await res.json();
    console.log('Customers found:', data.customers?.length);

    const customer = data.customers?.[0];

    if (!customer) {
      console.log('No customer found for email:', email);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access: false, reason: 'no_account' })
      };
    }

    console.log('Customer found:', customer.email);
    console.log('Raw tags value:', customer.tags);
    console.log('Tags type:', typeof customer.tags);

    const tagsRaw = Array.isArray(customer.tags)
      ? customer.tags.join(', ')
      : (customer.tags || '');

    const tags = tagsRaw.split(/,\s*/).map(t => t.trim().toLowerCase());
    console.log('Parsed tags array:', JSON.stringify(tags));

    const hasAccess = tags.includes('sacred-vault-member');
    console.log('Has access:', hasAccess);

    if (!hasAccess) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access: false, reason: 'no_subscription' })
      };
    }

    const secret = process.env.JWT_SECRET || 'sacred-vault-secret-2025';
    const payload = { email: customer.email, name: customer.first_name || 'Beloved', ts: Date.now() };
    const payloadStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
    const sessionToken = Buffer.from(payloadStr).toString('base64') + '.' + sig;

    console.log('Access GRANTED for:', customer.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access: true,
        name: customer.first_name || 'Beloved',
        email: customer.email,
        token: sessionToken
      })
    };

  } catch (err) {
    console.error('check-access CAUGHT ERROR:', err.message);
    console.error('Stack:', err.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};
