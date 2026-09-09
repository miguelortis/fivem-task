import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No se proporcionaron archivos" }, { status: 400 });
    }

    const uploadedUrls = [];
    for (const file of files) {
      const filename = `fivem-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${file.name.replace(/\s+/g, '-')}`;
      const blob = await put(filename, file, { access: "public" });
      uploadedUrls.push(blob.url);
    }

    return NextResponse.json({ urls: uploadedUrls }, { status: 200 });
  } catch (error) {
    console.error("Error subiendo archivos a Blob:", error);
    return NextResponse.json({ message: "Error al subir las imágenes" }, { status: 500 });
  }
}