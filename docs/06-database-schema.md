# Database Schema (Prisma)

## Key Entities & Relationships

### 1. User
- `id` (String, CUID), `email`, `passwordHash`, `role` (Enum: CUSTOMER, ADMIN), `createdAt`, `updatedAt`
- Relations: `Address[]`, `Order[]`

### 2. Address
- `id`, `userId`, `street`, `city`, `state`, `pincode`, `country`, `isDefaultShipping`, `isDefaultBilling`

### 3. Product
- `id`, `name`, `slug` (Unique), `description`, `shortDescription`, `basePrice` (Decimal), `salePrice` (Decimal), `isPublished`, `isFeatured`, `createdAt`, `updatedAt`
- Relations: `ProductImage[]`, `ProductVariant[]`, `ProductCategory[]`

### 4. ProductVariant
- `id`, `productId`, `sku` (Unique), `size`, `color`, `inventoryCount` (Int), `priceAdjustment` (Decimal)

### 5. ProductImage
- `id`, `productId`, `url` (Cloudinary), `altText`, `isPrimary`, `order` (Int)

### 6. Category
- `id`, `name`, `slug` (Unique), `description`, `imageUrl`
- Relations: `ProductCategory[]`

### 7. Order
- `id`, `userId`, `totalAmount` (Decimal), `status` (Enum), `paymentStatus` (Enum), `shippingAddressId`, `createdAt`, `updatedAt`
- Relations: `OrderItem[]`, `Payment[]`, `Shipment[]`

### 8. OrderItem
- `id`, `orderId`, `variantId`, `quantity` (Int), `priceAtPurchase` (Decimal)

### 9. Payment (Razorpay)
- `id`, `orderId`, `razorpayOrderId`, `razorpayPaymentId`, `status`, `amount`, `currency`

### 10. Shipment (Shiprocket)
- `id`, `orderId`, `shiprocketOrderId`, `shiprocketShipmentId`, `awbCode`, `courierName`, `status`, `trackingUrl`

## Departments, categories and product attributes

The sections above are the original plan. The catalog is now organised like this (source of truth: `prisma/schema.prisma` and `src/lib/catalog-config.ts`).

**Category** is a two-level tree. A *department* has `parentId = null` (Clothing, Bags, Jewellery, Nail Extensions); a *category* has `parentId` set (Tops, Handbags, Rings, Press-on Sets ...). Each row carries `type` (`ProductType`: `CLOTHING | BAGS | JEWELLERY | NAIL_EXTENSIONS`), which a category always inherits from its department, and `sortOrder` for menu order. Products belong to a category; the storefront page of a department also lists the products of all its categories.

**Product attributes** depend on the department (`PRODUCT_TYPE_CONFIG`):

| Department | Required | Columns used |
| --- | --- | --- |
| Clothing | Size, Color, Fabric | `variants.size`, `color`, `material` |
| Bags | Color, Material, Size (Dimensions) | `color`, `material`, `dimensions` |
| Jewellery | Color / Finish, Material (Size / Length optional) | `color`, `material`, `variants.size` |
| Nail Extensions | Size, Shape, Finish | `variants.size`, `shape`, `finish` |

`ProductVariant.size` is a free-text label (S, 32, 7, 18", 12 mm) with its own stock. The admin API (`/api/admin/products`) rejects a product that is missing what its department requires, and clears attributes the department does not use.

Storefront filters (size, color, material, shape, finish) are URL query parameters, e.g. `/categories/tops?size=M,L&color=Black`.

Applying the schema and creating the departments on an existing database:

```bash
npx prisma db push
node scripts/setup-categories.js
```

## Daily Drop

New pieces are released once a day at 8:30 AM IST. All the timing rules live in `src/lib/drop.ts`.

- `Product.releaseAt`: when the product goes live. It is hidden from the whole storefront (home, shop, categories, its own page, and checkout) until then. `null` means it was added before drops existed and is simply live.
- `Product.isDrop`: show the product in the homepage **Daily Drop** section for 24 hours after `releaseAt`. After that it leaves the section on its own and appears in New Arrivals, which is ordered by release time.
- In the admin product form, a new product defaults to "Next daily drop" (hidden until the next 8:30 AM). Other choices: right now, a custom date and time, or (when editing) keep as it is. Untick "Feature in the Daily Drop" to add a regular product.
- The homepage and cached catalog queries refresh every 60 seconds, and the on-page countdown re-fetches when it reaches zero, so a release shows up within about a minute of its time.
- Between drops, once the store has used drops at least once, the section turns into a "next drop in ..." teaser.
