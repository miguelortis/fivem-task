import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";

// Actualizar una tarea (Mover de columna, añadir nota, etc.)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { status, newNote, assignedTo, priority } = body;

    await connectDB();
    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ message: "Tarea no encontrada" }, { status: 404 });
    }

    // SEGURIDAD: Un usuario normal solo puede editar tareas si le pertenecen
    const isAssigned = task.assignedTo?.toString() === session.user.id;
    const isCreator = task.createdBy?.toString() === session.user.id;
    
    if (session.user.role !== "admin" && !isAssigned && !isCreator) {
      return NextResponse.json({ message: "No tienes permiso para editar esta tarea" }, { status: 403 });
    }

    // Preparamos los datos a actualizar
    const updateData: any = {
      lastModifiedBy: session.user.id
    };

    // Si el front envía un nuevo estado (ej. la arrastró a "En Progreso")
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    // Si el front envía una nueva nota
    if (newNote) {
      updateData.$push = {
        notes: {
          text: newNote,
          author: session.user.id,
          createdAt: new Date()
        }
      };
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData.notes ? { $set: updateData, $push: updateData.$push } : { $set: updateData },
      { new: true }
    )
    .populate("assignedTo", "name")
    .populate("lastModifiedBy", "name")
    .populate("notes.author", "name");

    return NextResponse.json(updatedTask);
  } catch (error) {
    return NextResponse.json({ message: "Error al actualizar tarea" }, { status: 500 });
  }
}

// Eliminar una tarea (Solo admins)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Solo los administradores pueden borrar tareas" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    await Task.findByIdAndDelete(id);

    return NextResponse.json({ message: "Tarea eliminada correctamente" });
  } catch (error) {
    return NextResponse.json({ message: "Error al eliminar tarea" }, { status: 500 });
  }
}