import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, ilike, inArray, notInArray } from "drizzle-orm";
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
  if (!membership || membership.status !== "ACCEPTED") {
    res.status(403).json({ error: "Acesso negado. Você precisa aceitar o convite primeiro." });
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
    .where(
      and(
        inArray(organizationMembersTable.organizationId, organizationIds),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );

  const counts = new Map<number, number>();
  for (const member of members) {
    counts.set(member.organizationId, (counts.get(member.organizationId) ?? 0) + 1);
  }
  return counts;
}

// 1. Get user's accepted organizations
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
            eq(organizationMembersTable.status, "ACCEPTED"),
            ilike(organizationsTable.name, `%${search}%`),
          )
        : and(
            eq(organizationMembersTable.userId, userId),
            eq(organizationMembersTable.status, "ACCEPTED")
          ),
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
        isPrivate: item.organization.isPrivate,
        role,
        permissions: getPermissions(role),
        memberCount: counts.get(item.organization.id) ?? 0,
        createdAt: item.organization.createdAt.toISOString(),
        updatedAt: item.organization.updatedAt.toISOString(),
      };
    }),
  );
});

// 2. Get public organizations that the user is not a member of (invites/active)
router.get("/organizations/public", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  // Get user's memberships (both pending and accepted)
  const userMemberships = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId));

  const excludedOrgIds = userMemberships.map((m) => m.organizationId);

  const conditions = [eq(organizationsTable.isPrivate, false)];
  if (excludedOrgIds.length > 0) {
    conditions.push(notInArray(organizationsTable.id, excludedOrgIds));
  }
  if (search) {
    conditions.push(ilike(organizationsTable.name, `%${search}%`));
  }

  const publicOrgs = await db
    .select()
    .from(organizationsTable)
    .where(and(...conditions))
    .orderBy(desc(organizationsTable.updatedAt));

  const counts = await getMemberCount(publicOrgs.map((o) => o.id));

  res.json(
    publicOrgs.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description ?? null,
      ownerId: org.ownerId,
      isPrivate: org.isPrivate,
      memberCount: counts.get(org.id) ?? 0,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    })),
  );
});

// 3. Get pending invites for the user
router.get("/organizations/invites", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const invites = await db
    .select({
      id: organizationMembersTable.id,
      role: organizationMembersTable.role,
      createdAt: organizationMembersTable.createdAt,
      organization: organizationsTable,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationMembersTable.organizationId, organizationsTable.id))
    .where(
      and(
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "PENDING")
      )
    )
    .orderBy(desc(organizationMembersTable.createdAt));

  res.json(
    invites.map((item) => ({
      id: item.id,
      role: item.role,
      createdAt: item.createdAt.toISOString(),
      organization: {
        id: item.organization.id,
        name: item.organization.name,
        description: item.organization.description ?? null,
      },
    })),
  );
});

// 4. Create a new organization
router.post("/organizations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : null;
  const isPrivate = !!req.body?.isPrivate;

  // Name validation
  if (name.length < 3 || name.length > 80) {
    res.status(400).json({ error: "Nome deve ter entre 3 e 80 caracteres" });
    return;
  }
  const nameRegex = /^[a-zA-Z0-9À-ÿ\s\-_]+$/;
  if (!nameRegex.test(name)) {
    res.status(400).json({ error: "Nome inválido. Use apenas letras, números, espaços, hífen ou sublinhado." });
    return;
  }

  // Enforce 10 organizations max per user
  const userOrgs = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (userOrgs.length >= 10) {
    res.status(400).json({ error: "Você atingiu o limite de 10 grupos" });
    return;
  }

  const organization = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organizationsTable)
      .values({ name, description: description || null, ownerId: userId, isPrivate })
      .returning();

    await tx.insert(organizationMembersTable).values({
      organizationId: created.id,
      userId,
      role: "OWNER",
      status: "ACCEPTED",
    });

    return created;
  });

  res.status(201).json({
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    ownerId: organization.ownerId,
    isPrivate: organization.isPrivate,
    role: "OWNER",
    permissions: getPermissions("OWNER"),
    memberCount: 1,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  });
});

// 5. Accept pending invite
router.post("/organizations/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [membership] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "PENDING")
      )
    )
    .limit(1);

  if (!membership) {
    res.status(404).json({ error: "Convite não encontrado" });
    return;
  }

  // Enforce 10 organizations max per user
  const userOrgs = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (userOrgs.length >= 10) {
    res.status(400).json({ error: "Você atingiu o limite de 10 grupos" });
    return;
  }

  // Enforce 50 users max per organization
  const orgMembers = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (orgMembers.length >= 50) {
    res.status(400).json({ error: "O grupo atingiu o limite de 50 membros" });
    return;
  }

  await db
    .update(organizationMembersTable)
    .set({ status: "ACCEPTED" })
    .where(eq(organizationMembersTable.id, membership.id));

  res.json({ success: true });
});

// 6. Decline pending invite
router.post("/organizations/:id/decline", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  await db
    .delete(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "PENDING")
      )
    );

  res.json({ success: true });
});

// 7. Join public organization directly
router.post("/organizations/:id/join", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [organization] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!organization) {
    res.status(404).json({ error: "Grupo não encontrado" });
    return;
  }

  if (organization.isPrivate) {
    res.status(403).json({ error: "Este grupo é privado" });
    return;
  }

  const [existing] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === "ACCEPTED") {
      res.status(400).json({ error: "Você já está neste grupo" });
    } else {
      res.status(400).json({ error: "Você já tem um convite pendente para este grupo" });
    }
    return;
  }

  // Enforce 10 organizations max per user
  const userOrgs = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (userOrgs.length >= 10) {
    res.status(400).json({ error: "Você atingiu o limite de 10 grupos" });
    return;
  }

  // Enforce 50 users max per organization
  const orgMembers = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (orgMembers.length >= 50) {
    res.status(400).json({ error: "O grupo atingiu o limite de 50 membros" });
    return;
  }

  await db
    .insert(organizationMembersTable)
    .values({
      organizationId,
      userId,
      role: "MEMBER",
      status: "ACCEPTED",
    });

  res.json({ success: true });
});

// 8. Get organization details (requires accepted membership)
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
      status: organizationMembersTable.status,
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
    isPrivate: organization.isPrivate,
    role,
    permissions: getPermissions(role),
    memberCount: members.filter(m => m.status === "ACCEPTED").length,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      username: member.username,
      email: member.email,
      avatarUrl: member.avatarUrl ?? null,
      role: normalizeRole(member.role),
      status: member.status,
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

// 9. Update organization
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
  const isPrivate = typeof req.body?.isPrivate === "boolean" ? req.body.isPrivate : undefined;

  if (name !== undefined) {
    if (name.length < 3 || name.length > 80) {
      res.status(400).json({ error: "Nome deve ter entre 3 e 80 caracteres" });
      return;
    }
    const nameRegex = /^[a-zA-Z0-9À-ÿ\s\-_]+$/;
    if (!nameRegex.test(name)) {
      res.status(400).json({ error: "Nome inválido. Use apenas letras, números, espaços, hífen ou sublinhado." });
      return;
    }
  }

  const [organization] = await db
    .update(organizationsTable)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(isPrivate !== undefined ? { isPrivate } : {}),
    })
    .where(eq(organizationsTable.id, organizationId))
    .returning();

  res.json({
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    ownerId: organization.ownerId,
    isPrivate: organization.isPrivate,
    role,
    permissions: getPermissions(role),
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  });
});

// 10. Delete organization
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

// 11. Invite member (inserts as PENDING)
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
    if (existing.status === "ACCEPTED") {
      res.status(409).json({ error: "Usuário já está na organização" });
    } else {
      res.status(409).json({ error: "Usuário já possui um convite pendente para este grupo" });
    }
    return;
  }

  // Enforce 10 organizations max per user
  const targetUserOrgsCount = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.userId, user.id),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (targetUserOrgsCount.length >= 10) {
    res.status(400).json({ error: "O usuário já atingiu o limite de 10 grupos" });
    return;
  }

  // Enforce 50 users max per organization
  const activeMembersCount = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, organizationId),
        eq(organizationMembersTable.status, "ACCEPTED")
      )
    );
  if (activeMembersCount.length >= 50) {
    res.status(400).json({ error: "O grupo já atingiu o limite de 50 membros" });
    return;
  }

  const [member] = await db
    .insert(organizationMembersTable)
    .values({ organizationId, userId: user.id, role, status: "PENDING" })
    .returning();

  res.status(201).json({
    id: member.id,
    userId: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
  });
});

// 12. Remove member
router.delete("/organizations/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const organizationId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const currentUserId = req.user!.userId;
  if (!Number.isInteger(organizationId) || !Number.isInteger(targetUserId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const targetMembership = await getMembership(organizationId, targetUserId);
  if (!targetMembership) {
    res.status(404).json({ error: "Membro não encontrado" });
    return;
  }

  const removingSelf = targetUserId === currentUserId;
  
  if (!removingSelf) {
    const membership = await requireMembership(organizationId, currentUserId, res);
    if (!membership) return;
    if (!getPermissions(normalizeRole(membership.role)).manageMembers) {
      res.status(403).json({ error: "Sem permissão para remover membros" });
      return;
    }
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

// 13. Post message
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
