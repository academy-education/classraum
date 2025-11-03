import { NextResponse } from 'next/server'
import * as crypto from 'crypto'

export async function POST(req: Request) {
  const { price, invoiceId } = await req.json()

  // One-time payment setup (exactly matching KG Inicis sample)
  const mid = "INIpayTest"                                               // 상점아이디
  const signKey = "SU5JTElURV9UUklQTEVERVNfS0VZU1RS"                    // 테스트용 signkey
  const mKey = crypto.createHash("sha256").update(signKey).digest('hex') // SHA256 Hash값
  const timestamp = new Date().getTime()                                 // 타임스템프
  const oid = invoiceId ? `INV_${invoiceId}_${timestamp}` : `INIpayTest_${timestamp}` // 주문번호 with invoice ID
  const use_chkfake = "Y"                                               // 테스트 모드

  // Signature generation - exact order matters!
  const signature = crypto.createHash("sha256").update("oid="+oid+"&price="+price+"&timestamp="+timestamp).digest('hex')
  const verification = crypto.createHash("sha256").update("oid="+oid+"&price="+price+"&signKey="+signKey+"&timestamp="+timestamp).digest('hex')

  return NextResponse.json({
    mid,
    oid,
    price,
    timestamp,
    mKey,
    use_chkfake,
    signature,
    verification,
    goodname: invoiceId ? `Invoice ${invoiceId}` : 'Test Payment', // Product name
    buyername: 'Student',
    buyertel: '01012345678',
    buyeremail: 'student@example.com',
    P_NOTI: invoiceId || '' // Pass invoice ID as custom data
  })
}