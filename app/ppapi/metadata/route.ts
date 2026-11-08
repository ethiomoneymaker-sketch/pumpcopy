import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: JSON.stringify({ pinataContent: body }),
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const { IpfsHash } = await r.json();
  return NextResponse.json({ uri: `https://gateway.pinata.cloud/ipfs/${IpfsHash}` });
}
