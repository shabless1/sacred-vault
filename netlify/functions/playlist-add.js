exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { email, action, content_id, track_index, track_title, track_url } = JSON.parse(event.body);

    if (!email || !content_id === undefined || track_index === undefined) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    const supabaseHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    if (action === 'add') {
      await fetch(`${supabaseUrl}/rest/v1/playlists`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'resolution=ignore-duplicates' },
        body: JSON.stringify({ email, content_id, track_index, track_title, track_url })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'remove') {
      await fetch(
        `${supabaseUrl}/rest/v1/playlists?email=eq.${encodeURIComponent(email)}&content_id=eq.${content_id}&track_index=eq.${track_index}`,
        { method: 'DELETE', headers: supabaseHeaders }
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};