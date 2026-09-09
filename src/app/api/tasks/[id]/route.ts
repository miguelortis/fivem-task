import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { del } from "@vercel/blob"; // <-- ESTA IMPORTACIÓN ES LA QUE SOLUCIONA EL ERROR
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { 
      status, 
      newNote, 
      noteImageUrl, 
      deleteNoteId, 
      removeImageUrl, 
      removeNoteImageId, 
      assignedTo, 
      priority, 
      title, 
      type, 
      createdBy 
    } = body;

    await connectDB();
    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ message: "Tarea no encontrada" }, { status: 404 });
    }

    // 1. Eliminar una nota completa (y su imagen adjunta si la tenía en Blob)
    if (deleteNoteId) {
      const noteObj = task.notes.id(deleteNoteId);
      if (!noteObj) return NextResponse.json({ message: "Nota no encontrada" }, { status: 404 });

      const isNoteAuthor = noteObj.author?.toString() === session.user.id;
      if (session.user.role !== "admin" && !isNoteAuthor) {
        return NextResponse.json({ message: "No autorizado" }, { status: 403 });
      }

      if (noteObj.imageUrl) {
        try {
          await del(noteObj.imageUrl);
        } catch (err) {
          console.error("Error borrando imagen de la nota en Blob:", err);
        }
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
      .populate("notes.author", "name email");

      return NextResponse.json(updatedTask);
    }

    // 2. Eliminar únicamente la imagen adjunta de una nota específica
    if (removeNoteImageId) {
      const noteObj = task.notes.id(removeNoteImageId);
      if (noteObj && noteObj.imageUrl) {
        try {
          await del(noteObj.imageUrl);
        } catch (err) {
          console.error("Error borrando imagen de nota en Blob:", err);
        }
      }

      const updatedTask = await Task.findOneAndUpdate(
        { _id: id, "notes._id": removeNoteImageId },
        { 
          $set: { "notes.$.imageUrl": null, lastModifiedBy: session.user.id } 
        },
        { new: true }
      )
      .populate("assignedTo", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("notes.author", "name email");

      return NextResponse.json(updatedTask);
    }

    // 3. Eliminar la imagen principal de la tarea
    if (removeImageUrl) {
      if (task.imageUrl) {
        try {
          await del(task.imageUrl);
        } catch (err) {
          console.error("Error borrando imagen principal en Blob:", err);
        }
      }

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: { imageUrl: null, lastModifiedBy: session.user.id } },
        { new: true }
      )
      .populate("assignedTo", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("notes.author", "name email");

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
    if (createdBy && session.user.role === "admin") updateOps.$set.createdBy = createdBy;
    if (assignedTo !== undefined) updateOps.$set.assignedTo = assignedTo;

    if (newNote) {
      updateOps.$push = {
        notes: {
          text: newNote,
          author: session.user.id,
          imageUrl: noteImageUrl || null,
          createdAt: new Date()
        }
      };
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateOps, { new: true })
      .populate("assignedTo", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("notes.author", "name email");

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error al actualizar tarea:", error);
    return NextResponse.json({ message: "Error al actualizar tarea" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Solo administradores" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    
    const task = await Task.findById(id);
    if (task) {
      if (task.imageUrl) {
        try { await del(task.imageUrl); } catch (e) { console.error(e); }
      }
      if (task.notes && task.notes.length > 0) {
        for (const note of task.notes) {
          if (note.imageUrl) {
            try { await del(note.imageUrl); } catch (e) { console.error(e); }
          }
        }
      }
      await Task.findByIdAndDelete(id);
    }

    return NextResponse.json({ message: "Tarea eliminada correctamente" });
  } catch (error) {
    return NextResponse.json({ message: "Error al eliminar tarea" }, { status: 500 });
  }
}