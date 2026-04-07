import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// GET /notes/task/:taskId — get all notes for a task
router.get('/task/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all notes for this task
    const notes = await prisma.taskNote.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(notes);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /notes/task/:taskId — create a new note for a task
router.post('/task/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Create note
    const note = await prisma.taskNote.create({
      data: {
        content: content.trim(),
        taskId,
        authorId: req.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(note);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /notes/:noteId — update a note
router.put('/:noteId', requireAuth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Get the note
    const note = await prisma.taskNote.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only allow updating own notes
    if (note.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own notes' });
    }

    // Update note
    const updatedNote = await prisma.taskNote.update({
      where: { id: noteId },
      data: {
        content: content.trim()
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(updatedNote);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /notes/:noteId — delete a note
router.delete('/:noteId', requireAuth, async (req, res) => {
  try {
    const { noteId } = req.params;

    // Get the note
    const note = await prisma.taskNote.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only allow deleting own notes
    if (note.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }

    // Delete note
    await prisma.taskNote.delete({
      where: { id: noteId }
    });

    res.status(204).send();
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;
