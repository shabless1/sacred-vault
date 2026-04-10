// functions/api/stripe-webhook.js
// Cloudflare Pages Function - listens for Stripe subscription events

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.text();
    const event = JSON.parse(body);

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    const supabaseHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    // Handle subscription created or updated
    if (event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated') {

      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status === 'active' ? 'active' : 'cancelled';

      // Get customer email from Stripe
      const customerRes = await fetch(
        `https://api.stripe.com/v1/customers/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
          }
        }
      );

      const customer = await customerRes.json();
      const email = customer.email?.toLowerCase();
      const name = customer.name || customer.metadata?.name || 'Beloved';

      if (!email) {
        return new Response('No email found', { status: 400 });
      }

      // Upsert subscriber in Supabase
      await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          email,
          name,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status,
          updated_at: new Date().toISOString()
        })
      });
    }

    // Handle subscription cancelled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const customerRes = await fetch(
        `https://api.stripe.com/v1/customers/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
          }
        }
      );

      const customer = await customerRes.json();
      const email = customer.email?.toLowerCase();

      if (email) {
        await fetch(
          `${supabaseUrl}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`,
          {
            method: 'PATCH',
            headers: supabaseHeaders,
            body: JSON.stringify({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
          }
        );
      }
    }

    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Server error', { status: 500 });
  }
}
