import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (!/[A-Z]/.test(password) && !/[a-z]/.test(password))
    return "رمز عبور باید شامل حروف باشد";
  return null;
}
