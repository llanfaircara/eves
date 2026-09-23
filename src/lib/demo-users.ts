import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const FILE = path.join(process.cwd(), "src/lib/demo-users.json");

type DemoUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  createdAt: string;
};

let memUsers: DemoUser[] | null = null;

function ensureFile() {
  try {
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2));
  } catch {
    if (!memUsers) memUsers = [];
  }
}

export function getDemoUsers(): DemoUser[] {
  if (memUsers) return memUsers;
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    if (!memUsers) memUsers = [];
    return memUsers;
  }
}

function persist(users: DemoUser[]) {
  if (memUsers !== null) {
    memUsers = users;
    return;
  }
  try {
    fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
  } catch {
    memUsers = users;
  }
}

export function findDemoUser(email: string): DemoUser | undefined {
  const users = getDemoUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function addDemoUser(name: string, email: string, password: string, role: DemoUser["role"]): Promise<DemoUser> {
  const users = getDemoUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email already exists");
  }
  const hash = await bcrypt.hash(password, 10);
  const user: DemoUser = {
    id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hash,
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  persist(users);
  return user;
}

export function deleteDemoUser(id: string): boolean {
  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  persist(users);
  return true;
}

export async function verifyDemoUser(email: string, password: string): Promise<DemoUser | null> {
  const u = findDemoUser(email);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.passwordHash);
  return ok ? u : null;
}
