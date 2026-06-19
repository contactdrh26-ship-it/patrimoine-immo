export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { to, from, subject, html, pdfBase64, pdfFilename } = req.body;

    // Vérifications de base
    if (!to) {
      return res.status(400).json({ error: "Destinataire (to) manquant" });
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Clé RESEND_API_KEY non configurée sur le serveur" });
    }

    // Adresse expéditeur : celle fournie, sinon l'adresse de test gratuite Resend
    const fromAddress = from && from.trim() ? from.trim() : 'onboarding@resend.dev';

    // Construction du corps de l'email pour Resend
    const emailPayload = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject: subject || 'Quittance de loyer',
      html: html || '<p>Veuillez trouver votre quittance ci-jointe.</p>'
    };

    // Pièce jointe PDF (optionnelle) : le front envoie le PDF encodé en base64
    if (pdfBase64) {
      emailPayload.attachments = [
        {
          filename: pdfFilename || 'quittance.pdf',
          content: pdfBase64
        }
      ];
    }

    // Envoi via l'API Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, id: data.id });
    } else {
      // Resend renvoie un message d'erreur clair dans data.message
      return res.status(response.status).json({ error: data.message || JSON.stringify(data) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
