
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const { items } = await req.json(); // Recibe un array: [{ _id, status, order }]

    await connectDB();

    // bulkWrite ejecuta múltiples actualizaciones en MongoDB simultáneamente y súper rápido
    const bulkOps = items.map((item: any) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { 
          $set: { 
            status: item.status, 
            order: item.order,
            lastModifiedBy: session.user.id 
          } 
        }
      }
    }));

    await Task.bulkWrite(bulkOps);

    return NextResponse.json({ message: "Orden actualizado correctamente" });
  } catch (error) {
    return NextResponse.json({ message: "Error al actualizar orden" }, { status: 500 });
  }
}