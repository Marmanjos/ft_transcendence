import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import {
  db,
  organizationMembersTable,
  organizationMessagesTable,
  organizationsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

function isRole(value: unknown): value is OrganizationRole {
  return value === "OWNER" || value === "ADMIN" || value === "MEMBER";
}

function normalizeRole(value: unknown): OrganizationRole {
  return isRole(value) ? value : "MEMBER";
}

function getPermissions(role: OrganizationRole) {
  return {
    create: role === "OWNER" || role === "ADMIN",
    read: true,
    update: role === "OWNER" || role === "ADMIN",
    delete: role === "OWNER",
    manageMembers: role === "OWNER" || role === "ADMIN",
  };
}

async function getMembership(organizationId: number, userId: number) {
  const [membership] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.userId, userId),
      ),
    )
    .limit(1);

  return membership ?? null;
}

async function requireMembership(
  organizationId: number,
  userId: number,
  res: Response,
) {
  const membership = await getMembership(organizationId, userId);
  if (!membership) {
    res.status(404).json({ error: "Organização não encontrada" });
    return null;
  }
  return membership;
}

async function getMemberCount(organizationIds: number[]) {
  if (organizationIds.length === 0) return new Map<number, number>();

  const members = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      id: organizationMembersTable.id,
    })
    .from(organizationMembersTable)
    .where(inArray(organizationMembersTable.organizationId, organizationIds));

  const counts = new Map<number, number>();
  for (const member of members) {
    counts.set(member.organizationId, (counts.get(member.organizationId) ?? 0) + 1);
  }
  return counts;
}

router.get("/organizations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const memberships = await db
    .select({
      role: organizationMembersTable.role,
      organization: organizationsTable,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationMembersTable.organizationId, organizationsTable.id))
    .where(
      search
        ? and(
            eq(organizationMembersTable.userId, userId),
            ilike(organizationsTable.name, `%${search}%`),
          )
        : eq(organizationMembersTable.userId, userId),
    )
    .orderBy(desc(organizationsTable.updatedAt));

  const counts = await getMemberCount(memberships.map((item) => item.organization.id));

  res.json(
    memberships.map((item) => {
      const role = normalizeRole(item.role);
      return {
        id: item.organization.id,
        name: item.organization.name,
        description: item.organization.description ?? null,
        ownerId: item.organization.ownerId,
        role,
        permissions: getPermissions(role),
        memberCount: counts.get(item.organization.id) ?? 0,
        createdAt: item.organization.createdAt.toISOString(),
        updatedAt: item.organization.updatedAt.toISOString(),
      };
    }),
  );
});

router.post("/organizations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : null;

  if (name.length < 3 || name.length > 80) {
    res.status(400).json({ error: "Nome deve ter entre 3 e 80 caracteres" });
    return;
  }

  const organization = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organizationsTable)
      .values({ name, description: description || null, ownerId: userId })
      .returning();

    await tx.insert(organizationMembersTable).values({
      organizationId: created.id,
      userId,
      role: "OWNER",
    });

    return created;
  });

  res.status(201).json({
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    ownerId: organization.ownerId,
    role: "OWNER",
    permissions: getPermissions("OWNER"),
    memberCount: 1,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  });
});

router.get("/organizations/:id", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const membership = await requireMembership(organizationId, userId, res);
  if (!membership) return;

  const [organization] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!organization) {
    res.status(404).json({ error: "Organização não encontrada" });
    return;
  }

  const members = await db
    .select({
      id: organizationMembersTable.id,
      userId: organizationMembersTable.userId,
      role: organizationMembersTable.role,
      createdAt: organizationMembersTable.createdAt,
      username: usersTable.username,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(organizationMembersTable.userId, usersTable.id))
    .where(eq(organizationMembersTable.organizationId, organizationId));

  const messages = await db
    .select({
      id: organizationMessagesTable.id,
      text: organizationMessagesTable.text,
      createdAt: organizationMessagesTable.createdAt,
      senderId: organizationMessagesTable.senderId,
      senderUsername: usersTable.username,
    })
    .from(organizationMessagesTable)
    .innerJoin(usersTable, eq(organizationMessagesTable.senderId, usersTable.id))
    .where(eq(organizationMessagesTable.organizationId, organizationId))
    .orderBy(desc(organizationMessagesTable.createdAt))
    .limit(25);

  const role = normalizeRole(membership.role);
  res.json({
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    ownerId: organization.ownerId,
    role,
    permissions: getPermissions(role),
    memberCount: members.length,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      username: member.username,
      email: member.email,
      avatarUrl: member.avatarUrl ?? null,
      role: normalizeRole(member.role),
      createdAt: member.createdAt.toISOString(),
    })),
    messages: messages.reverse().map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    })),
  });
});

router.patch("/organizations/:id", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const membership = await requireMembership(organizationId, userId, res);
  if (!membership) return;
  const role = normalizeRole(membership.role);
  if (!getPermissions(role).update) {
    res.status(403).json({ error: "Sem permissão para atualizar organização" });
    return;
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : undefined;
  if (name !== undefined && (name.length < 3 || name.length > 80)) {
    res.status(400).json({ error: "Nome deve ter entre 3 e 80 caracteres" });
    return;
  }

  const [organization] = await db
    .update(organizationsTable)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    })
    .where(eq(organizationsTable.id, organizationId))
    .returning();

  res.json({
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    ownerId: organization.ownerId,
    role,
    permissions: getPermissions(role),
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  });
});

router.delete("/organizations/:id", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const membership = await requireMembership(organizationId, userId, res);
  if (!membership) return;
  if (normalizeRole(membership.role) !== "OWNER") {
    res.status(403).json({ error: "Apenas o dono pode apagar a organização" });
    return;
  }

  await db.delete(organizationsTable).where(eq(organizationsTable.id, organizationId));
  res.status(204).send();
});

router.post("/organizations/:id/members", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const currentUserId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const membership = await requireMembership(organizationId, currentUserId, res);
  if (!membership) return;
  if (!getPermissions(normalizeRole(membership.role)).manageMembers) {
    res.status(403).json({ error: "Sem permissão para gerir membros" });
    return;
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const role = normalizeRole(req.body?.role);
  if (!username) {
    res.status(400).json({ error: "Username é obrigatório" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const [existing] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.userId, user.id),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Usuário já está na organização" });
    return;
  }

  const [member] = await db
    .insert(organizationMembersTable)
    .values({ organizationId, userId: user.id, role })
    .returning();

  res.status(201).json({
    id: member.id,
    userId: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role,
    createdAt: member.createdAt.toISOString(),
  });
});

router.delete("/organizations/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const currentUserId = req.user!.userId;
  if (!Number.isInteger(organizationId) || !Number.isInteger(targetUserId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const membership = await requireMembership(organizationId, currentUserId, res);
  if (!membership) return;
  const currentRole = normalizeRole(membership.role);
  const removingSelf = targetUserId === currentUserId;
  if (!removingSelf && !getPermissions(currentRole).manageMembers) {
    res.status(403).json({ error: "Sem permissão para remover membros" });
    return;
  }

  const targetMembership = await getMembership(organizationId, targetUserId);
  if (!targetMembership) {
    res.status(404).json({ error: "Membro não encontrado" });
    return;
  }

  if (normalizeRole(targetMembership.role) === "OWNER") {
    res.status(400).json({ error: "O dono da organização não pode ser removido" });
    return;
  }

  await db
    .delete(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.userId, targetUserId),
      ),
    );

  res.status(204).send();
});

router.post("/organizations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const membership = await requireMembership(organizationId, userId, res);
  if (!membership) return;

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 1000) {
    res.status(400).json({ error: "Mensagem deve ter entre 1 e 1000 caracteres" });
    return;
  }

  const [message] = await db
    .insert(organizationMessagesTable)
    .values({ organizationId, senderId: userId, text })
    .returning();

  res.status(201).json({
    id: message.id,
    senderId: userId,
    senderUsername: req.user!.username,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  });
});

export default router;
