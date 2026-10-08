const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CSV_FILE_PATH = path.join(__dirname, 'products.csv');
const IMAGES_DIR = path.join(__dirname, 'images');

async function uploadImage(imagePath) {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'rebel_season_products',
      use_filename: true,
      unique_filename: false,
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading ${imagePath}:`, error);
    return null;
  }
}

function parseSizesAndStock(sizesStr) {
  if (!sizesStr) return [];
  // Example format: "S:10, M:20, L:15"
  return sizesStr.split(',').map(s => {
    const [size, stock] = s.split(':').map(str => str.trim());
    return { size, stock: parseInt(stock, 10) || 0 };
  }).filter(s => s.size && !isNaN(s.stock));
}

// Keep in step with src/lib/catalog-config.ts: what each department requires.
const REQUIRED_ATTRIBUTES = {
  CLOTHING: ['color', 'material'],
  BAGS: ['color', 'material', 'dimensions'],
  JEWELLERY: ['color', 'material'],
  NAIL_EXTENSIONS: ['shape', 'finish'],
};
const SIZE_MODE = { CLOTHING: 'required', BAGS: 'none', JEWELLERY: 'optional', NAIL_EXTENSIONS: 'required' };

// "rose  gold" -> "Rose Gold", so filters on the storefront group values together.
function normalizeAttribute(value) {
  const cleaned = (value || '').replace(/s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.replace(/(^|[s/(-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function processProduct(row) {
  try {
    console.log(`Processing: ${row.Name}`);

    // Find category
    const categorySlug = row['Category Slug']?.trim();
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      console.error(`  -> Category not found for slug: ${categorySlug}. Skipping.`);
      return;
    }
    if ((await prisma.category.count({ where: { parentId: category.id } })) > 0) {
      console.error(`  -> "${categorySlug}" is a department. Use one of its categories (e.g. tops, handbags). Skipping.`);
      return;
    }

    // Department-specific details
    const attributes = {
      color: normalizeAttribute(row['Color']),
      material: normalizeAttribute(row['Material']),
      shape: normalizeAttribute(row['Shape']),
      finish: normalizeAttribute(row['Finish']),
      dimensions: (row['Dimensions'] || '').replace(/s+/g, ' ').trim() || null,
    };
    const required = REQUIRED_ATTRIBUTES[category.type] || [];
    const missing = required.filter((key) => !attributes[key]);
    if (missing.length > 0) {
      console.error(`  -> Missing ${missing.join(', ')} (required for ${category.type}). Skipping.`);
      return;
    }
    for (const key of Object.keys(attributes)) {
      if (!required.includes(key)) attributes[key] = null;
    }

    // Upload images
    const imageFilenames = row['Image Filenames']?.split(',').map(f => f.trim()).filter(Boolean) || [];
    const imageUrls = [];
    
    for (const filename of imageFilenames) {
      const imagePath = path.join(IMAGES_DIR, filename);
      if (fs.existsSync(imagePath)) {
        console.log(`  -> Uploading image: ${filename}`);
        const url = await uploadImage(imagePath);
        if (url) imageUrls.push(url);
      } else {
        console.warn(`  -> Warning: Image file not found: ${imagePath}`);
      }
    }

    // Parse Variants and Stock
    const sizeMode = SIZE_MODE[category.type] || 'optional';
    const variantsData = sizeMode === 'none' ? [] : parseSizesAndStock(row['Sizes and Stock']);
    if (sizeMode === 'required' && variantsData.length === 0) {
      console.error(`  -> "Sizes and Stock" is required for ${category.type} (e.g. "S:10, M:20"). Skipping.`);
      return;
    }
    const totalStock = variantsData.length > 0
      ? variantsData.reduce((sum, v) => sum + v.stock, 0)
      : parseInt(row['Stock'], 10) || 0;

    // Calculate Discount
    const price = parseInt(row['Price'], 10) || 0;
    const originalPrice = parseInt(row['MRP'], 10) || null;
    let discount = 0;
    if (originalPrice && originalPrice > price) {
      discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    // Create Product
    const slug = slugify(row.Name) + '-' + Math.random().toString(36).substring(2, 6);

    const product = await prisma.product.create({
      data: {
        name: row.Name,
        slug: slug,
        categoryId: category.id,
        price: price,
        originalPrice: originalPrice,
        discount: discount > 0 ? discount : null,
        description: row.Description,
        ...attributes,
        images: imageUrls,
        stock: totalStock,
        hasVariants: variantsData.length > 0,
        variants: {
          create: variantsData.map(v => ({
            size: v.size,
            stock: v.stock
          }))
        }
      }
    });

    console.log(`  -> Success! Created product: ${product.name} with ${variantsData.length} variants and ${imageUrls.length} images.\n`);

  } catch (err) {
    console.error(`  -> Error processing product ${row.Name}:`, err);
  }
}

async function run() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_FILE_PATH}`);
    console.log('Please place your products.csv file in the scripts/ folder.');
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR);
    console.log(`Created images directory at ${IMAGES_DIR}`);
    console.log('Please place your product images in the scripts/images/ folder and run again.');
    process.exit(0);
  }

  const results = [];
  
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Found ${results.length} products in CSV. Starting upload...\n`);
      for (const row of results) {
        await processProduct(row);
      }
      console.log('Bulk upload complete!');
      await prisma.$disconnect();
    });
}

run();
