import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const fd = new FormData();
  fd.append("file", file);
  fd.append("pinataMetadata", JSON.stringify({ name: file.name }));
  const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: fd,
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const { IpfsHash } = await r.json();
  return NextResponse.json({ uri: `https://gateway.pinata.cloud/ipfs/${IpfsHash}` });
}
