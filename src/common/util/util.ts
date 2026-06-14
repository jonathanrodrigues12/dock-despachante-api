export function generateValidationCode(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}
