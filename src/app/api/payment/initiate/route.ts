import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { price } = await req.json()

  // One-time payment setup (exactly matching KG Inicis sample)
  const mid = "INIpayTest"                                               // 상점아이디
  const signKey = "SU5JTElURV9UUklQTEVERVNfS0VZU1RS"                    // 테스트용 signkey
  const mKey = crypto.createHash("sha256").update(signKey).digest('hex') // SHA256 Hash값
  const timestamp = new Date().getTime()                                 // 타임스템프
  const oid = "INIpayTest_" + timestamp                                  // 주문번호
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
    verification
  })
}