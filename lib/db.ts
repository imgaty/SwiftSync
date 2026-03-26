import { prisma } from './prisma';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  recoveryEmail?: string;
  createdAt: string;
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Get all users from the database
 */
export async function getAllUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany();
  return rows.map(rowToUser);
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? rowToUser(row) : null;
}

/**
 * Create a new user
 */
export async function createUser(
  email: string, 
  password: string, 
  name: string,
  dateOfBirth: string,
): Promise<User> {
  const user = await prisma.user.create({
    data: {
      email,
      password,
      name,
      dateOfBirth,
    },
  });

  return rowToUser(user);
}

/**
 * Update a user
 */
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  console.log('📝 updateUser called with id:', id);
  console.log('📝 Updates to apply:', Object.keys(updates));
  
  const data: Record<string, unknown> = {};
  
  if (updates.email !== undefined) data.email = updates.email;
  if (updates.password !== undefined) data.password = updates.password;
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.dateOfBirth !== undefined) data.dateOfBirth = updates.dateOfBirth;
  if (updates.recoveryEmail !== undefined) data.recoveryEmail = updates.recoveryEmail;
  
  if (Object.keys(data).length === 0) {
    return findUserById(id);
  }
  
  const user = await prisma.user.update({
    where: { id },
    data,
  });
  
  return rowToUser(user);
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function rowToUser(row: { id: string; email: string; password: string; name: string; dateOfBirth: string; recoveryEmail: string | null; createdAt: Date }): User {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    dateOfBirth: row.dateOfBirth,
    recoveryEmail: row.recoveryEmail ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
