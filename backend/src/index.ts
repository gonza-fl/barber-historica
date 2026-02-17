import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { z } from 'zod';

const fastify = Fastify({
  logger: true
});

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Register CORS
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// Health check
fastify.get('/api/health', async () => {
  return { status: 'OK', database: 'connected' };
});

// --- CLIENTS ROUTES ---

// Get all clients
fastify.get('/api/clients', async () => {
  return prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { records: true }
      }
    }
  });
});

// Create client
const createClientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional()
});

fastify.post('/api/clients', async (request, reply) => {
  try {
    const data = createClientSchema.parse(request.body);
    const client = await prisma.client.create({ data });
    return client;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error.format());
    }
    throw error;
  }
});

// Get client by ID with history
fastify.get('/api/clients/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      records: {
        orderBy: { date: 'desc' },
        include: {
          services: {
            include: { service: true }
          }
        }
      }
    }
  });
  
  if (!client) {
    return reply.status(404).send({ message: 'Client not found' });
  }
  
  return client;
});

// --- SERVICES ROUTES ---

// Get all services
fastify.get('/api/services', async () => {
  return prisma.service.findMany({
    orderBy: { name: 'asc' }
  });
});

// Create service
const serviceSchema = z.object({
  name: z.string().min(2),
  price: z.number().min(0)
});

fastify.post('/api/services', async (request, reply) => {
  try {
    const data = serviceSchema.parse(request.body);
    const service = await prisma.service.create({ data });
    return service;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error.format());
    }
    throw error;
  }
});

// Update service
fastify.patch('/api/services/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const data = serviceSchema.partial().parse(request.body);
    const service = await prisma.service.update({
      where: { id },
      data
    });
    return service;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error.format());
    }
    throw error;
  }
});

// Delete service
fastify.delete('/api/services/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await prisma.service.delete({ where: { id } });
  return { success: true };
});

// --- STATS ROUTES ---

fastify.get('/api/stats/financial', async () => {
  const [completedRecords, programmedRecords] = await Promise.all([
    prisma.haircutRecord.findMany({
      where: { status: 'COMPLETED' },
      select: { pricePaid: true, date: true },
      orderBy: { date: 'asc' }
    }),
    prisma.haircutRecord.findMany({
      where: { status: 'PROGRAMMED' },
      select: { pricePaid: true },
    })
  ]);

  const dailyIncome: Record<string, number> = {};
  completedRecords.forEach(r => {
    const day = r.date.toISOString().split('T')[0];
    dailyIncome[day] = (dailyIncome[day] || 0) + r.pricePaid;
  });

  const chartData = Object.entries(dailyIncome).map(([date, income]) => ({
    date,
    income
  }));

  const totalIncome = completedRecords.reduce((sum, r) => sum + r.pricePaid, 0);
  const projectedIncome = programmedRecords.reduce((sum, r) => sum + r.pricePaid, 0);

  return {
    totalIncome,
    projectedIncome,
    completedCount: completedRecords.length,
    programmedCount: programmedRecords.length,
    chartData
  };
});

// Update client (supporting photoUrl update)
fastify.patch('/api/clients/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const data = z.object({
      photoUrl: z.string().optional(),
      notes: z.string().optional(),
      phone: z.string().optional(),
      name: z.string().min(2).optional()
    }).parse(request.body);

    const client = await prisma.client.update({
      where: { id },
      data
    });
    return client;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error.format());
    }
    throw error;
  }
});

// --- HAIRCUT RECORDS ROUTES ---

// Create haircut record
const createRecordSchema = z.object({
  clientId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).default([]),
  status: z.enum(['COMPLETED', 'PROGRAMMED', 'CANCELED']).default('COMPLETED'),
  scheduledDate: z.string().datetime().optional().nullable(),
  pricePaid: z.number().min(0).default(0),
  haircutType: z.string(),
  technicalNotes: z.string().optional(),
  photoUrls: z.array(z.string()).default([])
});

fastify.post('/api/records', async (request, reply) => {
  try {
    const data = createRecordSchema.parse(request.body);
    
    // Fetch prices for the services to store them in RecordService
    const services = await prisma.service.findMany({
      where: { id: { in: data.serviceIds } }
    });

    const record = await prisma.haircutRecord.create({
      data: {
        clientId: data.clientId,
        status: data.status,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        pricePaid: data.pricePaid,
        haircutType: data.haircutType,
        technicalNotes: data.technicalNotes,
        photoUrls: data.photoUrls,
        services: {
          create: services.map(s => ({
            serviceId: s.id,
            price: s.price
          }))
        }
      },
      include: {
        services: {
          include: { service: true }
        }
      }
    });

    return record;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error.format());
    }
    throw error;
  }
});

// Update record status (e.g., confirm a programmed appointment)
fastify.patch('/api/records/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const data = z.object({
      haircutType: z.string().optional(),
      technicalNotes: z.string().optional(),
      pricePaid: z.number().min(0).optional(),
      status: z.enum(['COMPLETED', 'PROGRAMMED', 'CANCELED']).optional(),
      scheduledDate: z.string().datetime().optional().nullable(),
      serviceIds: z.array(z.string().uuid()).optional(),
      photoUrls: z.array(z.string()).optional(),
    }).parse(request.body);

    // If serviceIds are provided, we need to handle the many-to-many update
    const updateData: any = {
      haircutType: data.haircutType,
      technicalNotes: data.technicalNotes,
      pricePaid: data.pricePaid,
      status: data.status,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : data.scheduledDate,
      date: data.status === 'COMPLETED' ? new Date() : undefined,
      photoUrls: data.photoUrls
    };

    if (data.serviceIds) {
      // Fetch prices for the new services
      const services = await prisma.service.findMany({
        where: { id: { in: data.serviceIds } }
      });

      updateData.services = {
        deleteMany: {}, // Remove existing associations
        create: services.map(s => ({
          serviceId: s.id,
          price: s.price
        }))
      };
    }

    const record = await prisma.haircutRecord.update({
      where: { id },
      data: updateData,
      include: {
        services: {
          include: { service: true }
        }
      }
    });

    return record;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error.format());
    }
    throw error;
  }
});

// Run the server!
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
