import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';

// Handle GET (used by closeUrl when user cancels)
export async function GET() {
  return new Response(
    `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <script>
          window.close();
        </script>
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


// Handle POST (used by returnUrl on success)
export async function POST(req: NextRequest) {
  const body = await req.formData();

  const resultCode = body.get("resultCode")?.toString();
  const mid = body.get("mid")?.toString();
  const authToken = body.get("authToken")?.toString();
  const authUrl = body.get("authUrl")?.toString();
  const netCancelUrl = body.get("netCancelUrl")?.toString();

  if (resultCode !== "0000" || !authToken) {
    return new Response(
      `<html><body><script>window.close();</script></body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  const timestamp = Date.now().toString();
  const signature = crypto
    .createHash("sha256")
    .update(`authToken=${authToken}&timestamp=${timestamp}`)
    .digest("hex");

  const payload: Record<string, string> = {
    mid: mid || '',
    authToken: authToken || '',
    timestamp,
    signature,
    charset: "UTF-8",
    format: "JSON",
  };

  try {
    const response = await axios.post(authUrl!, new URLSearchParams(payload), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = response.data;

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/billing/complete?result=success&moid=${data.MOID}`
    );
  } catch (error) {
    console.error("Approval failed. Trying netCancel...", error);

    try {
      await axios.post(netCancelUrl!, new URLSearchParams(payload), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (cancelError) {
      console.error("Net cancel also failed:", cancelError);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/billing/complete?result=fail`
    );
  }
}
