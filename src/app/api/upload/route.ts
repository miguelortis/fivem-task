import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const filename = `fivem-task-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Subir a Vercel Blob con acceso público
    const blob = await put(filename, file, {
      access: "public",
    });

    return NextResponse.json(blob, { status: 200 });
  } catch (error) {
    console.error("Error subiendo archivo a Blob:", error);
    return NextResponse.json({ message: "Error al subir la imagen" }, { status: 500 });
  }
}