export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeAdminUser } = await import("./lib/admin");
    return initializeAdminUser();
  }
}
