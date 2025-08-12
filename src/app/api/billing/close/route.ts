import { NextResponse } from 'next/server';

export async function GET() {
  // Serve the official INICIS close script and show cancellation popup
  return new NextResponse(
    `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <script>
          // Show cancellation popup
          alert('Payment was cancelled. No charges were made to your account.');
          
          // Close the payment window
          if (window.opener) {
            window.close();
          }
        </script>
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
  );
}