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

  try {
    const { email } = JSON.parse(event.body);
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
    }

    const store = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!store || !token) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    // Look up customer by email via Admin API
    const res = await fetch(
      `https://${store}/admin/api/2025-07/customers/search.json?query=email:${encodeURIComponent(email)}&fields=id,email,first_name,tags`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to reach Shopify' }) };
    }

    const data = await res.json();
    const customer = data.customers?.[0];

    // No account found
    if (!customer) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access: false, reason: 'no_account' })
      };
    }

    // Check for sacred-vault-member tag
    // Handle tags whether returned as string or array
    let tagsRaw = customer.tags || '';
    if (Array.isArray(tagsRaw)) tagsRaw = tagsRaw.join(',');
    const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '-'));
    const hasAccess = tags.some(t => t === 'sacred-vault-member' || t.includes('sacred-vault-member'));

    if (!hasAccess) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access: false, reason: 'no_subscription' })
      };
    }

    // Generate a signed token so the vault can trust this response
    const secret = process.env.JWT_SECRET || 'sacred-vault-secret-2025';
    const payload = { email: customer.email, name: customer.first_name || 'Beloved', ts: Date.now() };
    const payloadStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
    const sessionToken = Buffer.from(payloadStr).toString('base64') + '.' + sig;

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
    console.error('check-access error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};
