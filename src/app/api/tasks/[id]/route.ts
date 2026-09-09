import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";

// Actualizar una tarea (Mover de columna, añadir nota, etc.)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { status, newNote, deleteNoteId, assignedTo, priority, title, type } = body;

    await connectDB();
    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ message: "Tarea no encontrada" }, { status: 404 });
    }

    // Si la acción es eliminar una nota específica
    if (deleteNoteId) {
      const noteObj = task.notes.id(deleteNoteId);
      if (!noteObj) return NextResponse.json({ message: "Nota no encontrada" }, { status: 404 });

      const isNoteAuthor = noteObj.author?.toString() === session.user.id;
      if (session.user.role !== "admin" && !isNoteAuthor) {
        return NextResponse.json({ message: "No autorizado para eliminar esta nota" }, { status: 403 });
      }

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { 
          $pull: { notes: { _id: deleteNoteId } },
          $set: { lastModifiedBy: session.user.id }
        },
        { new: true }
      )
      .populate("assignedTo", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("notes.author", "name email")

      return NextResponse.json(updatedTask);
    }

    const isAssigned = task.assignedTo?.toString() === session.user.id;
    const isCreator = task.createdBy?.toString() === session.user.id;
    
    if (session.user.role !== "admin" && !isAssigned && !isCreator && !newNote) {
      return NextResponse.json({ message: "No tienes permiso para editar" }, { status: 403 });
    }

    const updateOps: any = {
      $set: { lastModifiedBy: session.user.id }
    };

    if (status) updateOps.$set.status = status;
    if (priority) updateOps.$set.priority = priority;
    if (title && session.user.role === "admin") updateOps.$set.title = title;
    if (type && session.user.role === "admin") updateOps.$set.type = type;
    
    // Transferencia de tarea (Reasignar a otro desarrollador)
    if (body.assignedTo !== undefined && session.user.role === "admin") {
      updateOps.$set.assignedTo = body.assignedTo;
    }

    if (assignedTo !== undefined) updateOps.$set.assignedTo = assignedTo;

    if (newNote) {
      updateOps.$push = {
        notes: {
          text: newNote,
          author: session.user.id,
          createdAt: new Date()
        }
      };
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateOps, { new: true })
      .populate("assignedTo", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("notes.author", "name email")
      .populate("assignedTo", "name email")

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error al actualizar tarea:", error);
    return NextResponse.json({ message: "Error al actualizar tarea" }, { status: 500 });
  }
}

// Eliminar una tarea (Solo admins)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Solo administradores" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    await Task.findByIdAndDelete(id);

    return NextResponse.json({ message: "Tarea eliminada correctamente" });
  } catch (error) {
    return NextResponse.json({ message: "Error al eliminar tarea" }, { status: 500 });
  }
}