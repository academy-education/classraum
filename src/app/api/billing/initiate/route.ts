import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { price } = await req.json()

  // Standard payment setup (matching working Node.js example)
  const mid = 'INIpayTest'  // Standard payment test MID
  const signKey = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'
  const mKey = crypto.createHash('sha256').update(signKey).digest('hex')
  const timestamp = Date.now().toString()
  const oid = `INIpayTest_${timestamp}`
  const use_chkfake = 'Y'
  
  // SHA256 Hash values matching working example
  const signature = crypto
    .createHash('sha256')
    .update(`oid=${oid}&price=${price}&timestamp=${timestamp}`)
    .digest('hex')
    
  const verification = crypto
    .createHash('sha256') 
    .update(`oid=${oid}&price=${price}&signKey=${signKey}&timestamp=${timestamp}`)
    .digest('hex')

  return NextResponse.json({
    mid,
    oid,
    price,
    timestamp,
    mKey,
    signature,
    verification,
    use_chkfake
  })
}