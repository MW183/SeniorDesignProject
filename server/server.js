// Load environment variables before anything else
import "dotenv/config";  

import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient(); 

app.use(cors());
app.use(express.json());

//Error handler
const handlePrismaError = (res, error) => {
  console.error(error);

  switch(error.code){
    case 'P2002':
      return res.status(409).json({ error: "Unique constraint failed." });
    case 'P2025':
      return res.status(404).json({ error: "Record not found." });
    case 'P2003':
      return res.status(400).json({ error: "Foreign key constraint failed." });
    default:
      return res.status(500).json({ error: "Internal server error." });
  }
}

// User retrieval with search and filtering
app.get("/users", async (req, res) => {
  try {
    const { search, email, role, limit, offset } = req.query;
    
    // Build where clause for filtering
    const where = {
      deletedAt: null // Only get non-deleted users
    };
    
    // Search by name or email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Filter by exact email
    if (email) {
      where.email = { equals: email, mode: 'insensitive' };
    }
    
    // Filter by role
    if (role) {
      where.role = role;
    }
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, 
        name: true, 
        email: true,
        phone: true,
        role: true, 
        createdAt: true,
        createdBy: { select: {id: true, name: true, }}
      },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    handlePrismaError(res, error);
  }
});

// User creation
app.post("/users", async (req, res) => {
  try {
    const { name, email, phone, password, role, createdById } = req.body;
    
    // Optional field validations
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required." });
    }
    
    if (name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    
    if (!['ADMIN', 'USER', 'SUPPORT'].includes(role)) {
      return res.status(400).json({ error: "Role must be ADMIN, USER, or SUPPORT." });
    }

    const user = await prisma.user.create({
        data: { 
          name: name.trim(), 
          email: email.toLowerCase().trim(), 
          phone: phone?.trim() || null, 
          password, // In production: hash this!
          role, 
          createdById: createdById || null 
        }, 
        select: {
          id: true,
          name: true,
          email: true, 
          phone: true,
          role: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } }
        }
    }); 
    res.status(201).json(user);
  } catch (error) {
    handlePrismaError(res, error);
  }
});

// GET /users/:id - Get single user
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    handlePrismaError(res, error);
  }
});

// PUT /users/:id - Update user
app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;
    
    // Build update object only with provided fields
    const updateData = {};
    
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({ error: "Name must be at least 2 characters." });
      }
      updateData.name = name.trim();
    }
    
    if (email !== undefined) {
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: "Valid email is required." });
      }
      updateData.email = email.toLowerCase().trim();
    }
    
    if (role !== undefined) {
      if (!['ADMIN', 'USER', 'SUPPORT'].includes(role)) {
        return res.status(400).json({ error: "Role must be ADMIN, USER, or SUPPORT." });
      }
      updateData.role = role;
    }
    
    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }
    
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } }
      }
    });
    
    res.json(user);
  } catch (error) {
    handlePrismaError(res, error);
  }
});

// DELETE /users/:id - Soft delete user
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { id: true, name: true }
    });
    
    res.json({ message: "User deleted successfully", user: { id: user.id, name: user.name } });
  } catch (error) {
    handlePrismaError(res, error);
  }
});

// POST /users/search - Advanced user search with filters
app.post("/users/search", async (req, res) => {
  try {
    const { query, filters = {}, pagination = {} } = req.body;
    const { limit = 20, offset = 0 } = pagination;
    
    const where = {
      deletedAt: null,
      ...filters
    };
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ];
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      users,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    handlePrismaError(res, error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
