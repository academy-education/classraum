import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    
    // Mobile payment parameters (different from PC)
    const P_STATUS = body.get("P_STATUS")?.toString()  // Result code (00 = success)
    const P_RMESG1 = body.get("P_RMESG1")?.toString()  // Result message
    const P_TID = body.get("P_TID")?.toString()        // Transaction ID
    const P_AMT = body.get("P_AMT")?.toString()        // Amount
    const P_OID = body.get("P_OID")?.toString()        // Order ID
    const P_AUTH_DT = body.get("P_AUTH_DT")?.toString() // Auth date
    const P_NOTI = body.get("P_NOTI")?.toString()      // Custom data (invoice ID)

    console.log('Mobile payment return data:', {
      P_STATUS, P_RMESG1, P_TID, P_AMT, P_OID, P_NOTI
    })

    if (P_STATUS === "00") {  // Success code for mobile is "00" not "0000"
      // For mobile payments, we need to call approval API like the demo
      // But for now, just show success and redirect
      const successResponse = `
        <html>
        <head>
          <title>Payment Success</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <script>
            setTimeout(() => {
              alert('Payment completed successfully!\\nTransaction ID: ${P_TID}\\nAmount: ₩${P_AMT?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}');
              window.location.href = '/mobile/invoices';
            }, 1000);
          </script>
          <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h2 style="color: #28a745;">Payment Successful!</h2>
            <p><strong>Transaction ID:</strong> ${P_TID}</p>
            <p><strong>Amount:</strong> ₩${P_AMT?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
            <p><strong>Order ID:</strong> ${P_OID}</p>
            <p><strong>Date:</strong> ${P_AUTH_DT}</p>
            <p style="color: #666; margin-top: 20px;">Redirecting to invoices page...</p>
          </div>
        </body>
        </html>
      `
      
      return new NextResponse(successResponse, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
      
    } else {
      // Error case - mobile format
      const errorResponse = `
        <html>
        <head>
          <title>Payment Failed</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <script>
            setTimeout(() => {
              alert('Payment failed: ${P_RMESG1}');
              window.location.href = '/mobile/invoices';
            }, 1000);
          </script>
          <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h2 style="color: #dc3545;">Payment Failed</h2>
            <p><strong>Error:</strong> ${P_RMESG1}</p>
            <p><strong>Code:</strong> ${P_STATUS}</p>
            <p style="color: #666; margin-top: 20px;">Redirecting back to invoices...</p>
          </div>
        </body>
        </html>
      `
      
      return new NextResponse(errorResponse, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
    
  } catch (error) {
    console.error('Payment return processing error:', error)
    
    const errorResponse = `
      <html>
      <head>
        <title>Payment Error</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          setTimeout(() => {
            alert('Payment processing error occurred');
            if (window.opener) {
              window.close();
            } else {
              window.location.href = '/mobile/invoices';
            }
          }, 500);
        </script>
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #dc3545;">Payment Processing Error</h2>
          <p style="color: #666; margin-top: 20px;">This window will close automatically...</p>
        </div>
      </body>
      </html>
    `
    
    return new NextResponse(errorResponse, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}

// Handle GET requests too
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const resultCode = url.searchParams.get('resultCode')
  const resultMsg = url.searchParams.get('resultMsg')
  
  if (resultCode === '0000') {
    const successResponse = `
      <html>
      <head>
        <title>Payment Success</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          setTimeout(() => {
            alert('Payment completed successfully!');
            if (window.opener) {
              window.opener.location.reload();
              window.close();
            } else {
              window.location.href = '/mobile/invoices';
            }
          }, 500);
        </script>
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #28a745;">Payment Successful!</h2>
          <p style="color: #666; margin-top: 20px;">This window will close automatically...</p>
        </div>
      </body>
      </html>
    `
    return new NextResponse(successResponse, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } else {
    const errorResponse = `
      <html>
      <head>
        <title>Payment Failed</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          setTimeout(() => {
            alert('Payment failed: ${resultMsg || 'Unknown error'}');
            if (window.opener) {
              window.close();
            } else {
              window.location.href = '/mobile/invoices';
            }
          }, 500);
        </script>
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #dc3545;">Payment Failed</h2>
          <p style="color: #666; margin-top: 20px;">This window will close automatically...</p>
        </div>
      </body>
      </html>
    `
    return new NextResponse(errorResponse, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}