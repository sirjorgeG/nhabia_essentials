
const crypto = require('node:crypto');

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (
    Number(event.headers['content-length'] || 0) > 5000 ||
    (event.body || '').length > 5000
  ) {
    return json(413, { error: 'Request too large' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const salt = process.env.REVIEW_RATE_SALT;

  if (!url || !key || !secret || !salt) {
    return json(503, {
      error: 'Reviews are not configured yet'
    });
  }

  let x;

  try {
    x = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request' });
  }

  const name = String(x.display_name || '').trim();
  const email = String(x.reviewer_email || '').trim();
  const body = String(x.body || '').trim();
  const rating = x.rating;
  const productId = x.product_id;

 const validEmail =
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (
    !Number.isSafeInteger(Number(productId)) ||
    Number(productId) < 1 ||
    name.length < 2 ||
    name.length > 60 ||
    !validEmail ||
    body.length < 15 ||
    body.length > 1000 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    !x.captcha_token
  ) {
    return json(400, {
      error: 'Please check the review form and CAPTCHA'
    });
  }

  const ip = String(
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    'unknown'
  );

  const ipHash = crypto
    .createHmac('sha256', salt)
    .update(ip)
    .digest('hex');

  try {
    const captcha = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          secret,
          response: x.captcha_token,
          remoteip: ip
        })
      }
    );

    if (!captcha.ok) {
      return json(503, {
        error: 'CAPTCHA service unavailable'
      });
    }

    const verified = await captcha.json();

    if (!verified.success) {
      return json(403, {
        error: 'CAPTCHA verification failed'
      });
    }

    const headers = {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json'
    };

    const limit = await fetch(
      url + '/rest/v1/rpc/claim_review_slot',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_ip_hash: ipHash
        })
      }
    );

    if (!limit.ok) {
      return json(503, {
        error: 'Please try again later'
      });
    }

    if (await limit.json() !== true) {
      return json(429, {
        error: 'Too many reviews. Please try again later'
      });
    }

    const product = await fetch(
      url +
        '/rest/v1/products?id=eq.' +
        encodeURIComponent(productId) +
        '&select=id&limit=1',
      { headers }
    );

    if (
      !product.ok ||
      !(await product.json()).length
    ) {
      return json(400, {
        error: 'Product unavailable'
      });
    }

    const insert = await fetch(
      url + '/rest/v1/product_reviews',
      {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          product_id: Number(productId),
          reviewer_name: name,
          reviewer_email: email,
          rating: rating,
          review_text: body,
          status: 'pending'
        })
      }
    );

    if (!insert.ok) {
      return json(503, {
        error: 'Review could not be submitted'
      });
    }

    return json(202, {
      message: 'Review awaiting approval'
    });

  } catch {
    return json(503, {
      error: 'Review service temporarily unavailable'
    });
  }
};
