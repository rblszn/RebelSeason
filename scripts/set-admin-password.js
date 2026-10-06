// Sets a new password for an admin account.
//
//   node --env-file=.env scripts/set-admin-password.js admin@rebelseason.com
//
// You will be prompted for the new password (minimum 12 characters).
const readline = require("readline");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Hide typed characters.
  rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : "*");
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); }));
}

(async () => {
  const email = (process.argv[2] || "").toLowerCase().trim();
  if (!email) {
    console.error("Usage: node --env-file=.env scripts/set-admin-password.js <admin-email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "ADMIN") {
      console.error(`No admin account found for ${email}`);
      process.exit(1);
    }

    const password = await prompt("New admin password: ");
    const confirm = await prompt("Repeat password: ");
    if (password !== confirm) throw new Error("Passwords do not match");
    if (password.length < 12) throw new Error("Use at least 12 characters");

    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 12) } });
    console.log(`Password updated for ${email}.`);
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
