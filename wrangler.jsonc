export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle API route
    if (url.pathname === '/api/check-access') {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }});
      }

      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      try {
        const { email } = await request.json();
        if (!email) {
          return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers });
        }

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

    // For all other routes serve static assets
    return env.ASSETS.fetch(request);
  }
};
