// functions/api/check-access.js
// Cloudflare Pages Function - checks Supabase for active subscriber

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers });
    }

    // Check Supabase for active subscriber
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await res.json();
    const subscriber = data[0];

    if (!subscriber) {
      return new Response(JSON.stringify({ access: false, reason: 'no_account' }), { status: 200, headers });
    }

    if (subscriber.status !== 'active') {
      return new Response(JSON.stringify({ access: false, reason: 'no_subscription' }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      access: true,
      name: subscriber.name || 'Beloved',
      email: subscriber.email
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
