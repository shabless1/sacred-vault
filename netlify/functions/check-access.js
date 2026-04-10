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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    // Look up subscriber in Supabase
    const res = await fetch(
      `${supabaseUrl}/rest/v1/subscribers?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await res.json();
    const subscriber = data[0];

    if (!subscriber) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access: false, reason: 'no_account' })
      };
    }

    if (subscriber.status !== 'active') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access: false, reason: 'no_subscription' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access: true,
        name: subscriber.name || 'Beloved',
        email: subscriber.email
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};
