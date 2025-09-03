import { NextResponse } from 'next/server'

export async function GET() {
  // Close endpoint for one-time payments (matching KG Inicis sample)
  return new NextResponse(
    `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Cancelled</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          // Show cancellation popup
          setTimeout(() => {
            alert('Payment was cancelled. No charges were made to your account.');
            
            // Close the payment window
            if (window.opener) {
              window.close();
            } else {
              window.location.href = '/mobile/invoices';
            }
          }, 500);
        </script>
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #6c757d;">Payment Cancelled</h2>
          <p style="color: #666; margin-top: 20px;">This window will close automatically...</p>
        </div>
        <script language="javascript" type="text/javascript" src="https://stdpay.inicis.com/stdjs/INIStdPay_close.js" charset="UTF-8"></script>
      </body>
    </html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}