import fetch from 'node-fetch';

export default async function handler(req, res) {

  // ===== CORS 处理（关键）=====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // ===========================

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ssoToken, password } = req.body;

  if (password !== process.env.ACCESS_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!ssoToken) {
    return res.status(400).json({ error: 'Missing ssoToken' });
  }

  try {
    // Step 2: SSO → Bearer
    const ssoRes = await fetch(
      'https://oauth.battle.net/oauth/sso',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        body:
          'client_id=baedda12fe054e4abdfc3ad7bdea970a' +
          '&grant_type=client_sso' +
          '&scope=auth.authenticator' +
          '&token=' + ssoToken
      }
    );

    const ssoData = await ssoRes.json();

    if (!ssoData.access_token) {
      return res.status(400).json({ error: 'SSO failed', ssoData });
    }

    // Step 3: Get authenticator data
    const authRes = await fetch(
      'https://authenticator-rest-api.bnet-identity.blizzard.net/v1/authenticator',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ssoData.access_token}`,
          'accept': 'application/json'
        }
      }
    );

    const authData = await authRes.json();

    return res.status(200).json({
      serial: authData.serial,
      restoreCode: authData.restoreCode,
      deviceSecret: authData.deviceSecret
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
