// Creates the four departments (Clothing, Bags, Jewellery, Nail Extensions) and
// the categories under them. Safe to run more than once: it only creates what
// is missing, and for a category that already exists (same slug) it just places
// it under the right department. It never deletes or renames anything and never
// touches products.
//
//   node scripts/setup-categories.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEPARTMENTS = [
  {
    name: 'Clothing',
    slug: 'clothing',
    type: 'CLOTHING',
    description: 'Tops, bottoms, dresses, co-ord sets, bikinis and winterwear.',
    categories: [
      ['Tops', 'tops'],
      ['Bottoms & Jeans', 'bottoms-jeans'],
      ['Dresses', 'dresses'],
      ['Co-ord Sets', 'co-ord-sets'],
      ['Bikinis', 'bikinis'],
      ['Winterwear', 'winterwear'],
    ],
  },
  {
    name: 'Bags',
    slug: 'bags',
    type: 'BAGS',
    description: 'Handbags, totes, crossbody bags, backpacks and wallets.',
    categories: [
      ['Handbags', 'handbags'],
      ['Totes', 'totes'],
      ['Crossbody', 'crossbody'],
      ['Backpacks', 'backpacks'],
      ['Wallets', 'wallets'],
    ],
  },
  {
    name: 'Jewellery',
    slug: 'jewellery',
    type: 'JEWELLERY',
    description: 'Necklaces, earrings, rings and bracelets & bangles.',
    categories: [
      ['Necklaces', 'necklaces'],
      ['Earrings', 'earrings'],
      ['Rings', 'rings'],
      ['Bracelets & Bangles', 'bracelets-bangles'],
    ],
  },
  {
    name: 'Nail Extensions',
    slug: 'nail-extensions',
    type: 'NAIL_EXTENSIONS',
    description: 'Press-on sets and custom kits.',
    categories: [
      ['Press-on Sets', 'press-on-sets'],
      ['Custom Kits', 'custom-kits'],
    ],
  },
];

/** Creates the category if the slug is new; otherwise only fixes its place in the tree. */
async function ensure({ name, slug, description, type, parentId, sortOrder }) {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (!existing) {
    await prisma.category.create({ data: { name, slug, description, type, parentId, sortOrder } });
    console.log(`  + created   ${slug}`);
    return prisma.category.findUnique({ where: { slug } });
  }
  const needsUpdate = existing.parentId !== parentId || existing.type !== type;
  if (needsUpdate) {
    await prisma.category.update({ where: { slug }, data: { parentId, type } });
    console.log(`  ~ moved     ${slug} (kept its name "${existing.name}", image and products)`);
  } else {
    console.log(`  = unchanged ${slug}`);
  }
  return existing;
}

async function main() {
  const managedSlugs = new Set();

  for (const [i, dept] of DEPARTMENTS.entries()) {
    console.log(`\n${dept.name}`);
    managedSlugs.add(dept.slug);
    const department = await ensure({
      name: dept.name,
      slug: dept.slug,
      description: dept.description,
      type: dept.type,
      parentId: null,
      sortOrder: (i + 1) * 10,
    });

    for (const [j, [name, slug]] of dept.categories.entries()) {
      managedSlugs.add(slug);
      await ensure({ name, slug, description: null, type: dept.type, parentId: department.id, sortOrder: (j + 1) * 10 });
    }
  }

  // Products that were filed straight under a department (for example an older "Bags" category)
  // keep showing on the storefront. Editing one in the admin asks for a specific category first.
  for (const dept of DEPARTMENTS) {
    const direct = await prisma.product.count({ where: { category: { slug: dept.slug } } });
    if (direct > 0) {
      console.log(`
Note: ${direct} product(s) are filed directly under "${dept.name}". Move them into one of its categories from the product page.`);
    }
  }

  // Older categories that are not part of the new structure (for example "jackets").
  // They are left exactly as they are; move or rename them from Admin > Categories.
  const leftovers = await prisma.category.findMany({
    where: { slug: { notIn: [...managedSlugs] } },
    select: { name: true, slug: true, parentId: true, _count: { select: { products: true } } },
  });
  if (leftovers.length > 0) {
    console.log('\nOther categories already in the database (not changed):');
    for (const c of leftovers) {
      const where = c.parentId ? 'under a department' : 'top-level, shows up as its own menu item';
      console.log(`  - ${c.name} (${c.slug}): ${c._count.products} products, ${where}`);
    }
    console.log('Tip: in Admin > Categories, edit each one and set "Belongs to" to the right department.');
  }

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
