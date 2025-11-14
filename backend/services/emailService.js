import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Invia email di verifica account
 * @param {string} email - Email destinatario
 * @param {string} token - Token di verifica
 * @returns {Promise<object>} - Risultato invio email
 */
export async function sendVerificationEmail(email, token) {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica il tuo account TaxPilot</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center; background-color: #f4f4f4;">
              <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                
                <!-- Header con Logo -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      📊 TaxPilot
                    </h1>
                  </td>
                </tr>
                
                <!-- Contenuto -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: bold;">
                      Verifica il tuo account
                    </h2>
                    <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                      Grazie per esserti registrato a TaxPilot! Per completare la registrazione e iniziare a utilizzare la piattaforma, verifica il tuo indirizzo email cliccando sul pulsante qui sotto.
                    </p>
                    
                    <!-- Bottone Verifica -->
                    <table role="presentation" style="width: 100%; margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${verificationLink}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                            Verifica Email
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                      Se il pulsante non funziona, copia e incolla questo link nel tuo browser:
                    </p>
                    <p style="margin: 10px 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
                      ${verificationLink}
                    </p>
                  </td>
                </tr>
                
                <!-- Avviso Scadenza -->
                <tr>
                  <td style="padding: 0 40px 40px;">
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
                      <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                        ⚠️ <strong>Importante:</strong> Questo link di verifica scadrà tra 24 ore. Se non verifichi il tuo account entro questo periodo, dovrai richiedere un nuovo link di verifica.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0 0 10px; color: #999999; font-size: 12px;">
                      Se non hai richiesto questa registrazione, ignora questa email.
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} TaxPilot - Gestione documentale intelligente
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Verifica il tuo account TaxPilot',
      html: htmlTemplate
    });
    
    console.log('✅ Email di verifica inviata con successo:', result);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('❌ Errore invio email di verifica:', error);
    return { success: false, error: error.message };
  }
}

