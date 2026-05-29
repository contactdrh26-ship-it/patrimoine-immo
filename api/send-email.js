export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    const { to, nom, mois, annee, bailleur, bien, adresse, loyer, html } = req.body;
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: to,
          nom: nom || '',
          mois: mois || '',
          annee: annee || '2025',
          bailleur: bailleur || '',
          bien: bien || '',
          adresse: adresse || '',
          loyer: loyer || '',
          message: html || ''
        }
      })
    });
    const text = await response.text();
    if (response.status === 200) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(response.status).json({ error: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
