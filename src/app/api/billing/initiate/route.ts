import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {

  const { price } = await req.json()

  const mid = 'INIBillTst'
  const signkey = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'
  const mKey = crypto.createHash('sha256').update(signkey).digest('hex')
  const timestamp = Date.now().toString()
  const oid = `${mid}_${timestamp}`
  const signature = crypto
    .createHash('sha256')
    .update(`oid=${oid}&price=${price}&timestamp=${timestamp}`)
    .digest('hex')

  return NextResponse.json({
    mid,
    oid,
    price,
    timestamp,
    mKey,
    signature
  })
}