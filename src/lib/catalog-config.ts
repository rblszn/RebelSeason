// Single source of truth for what a product has to provide in each department.
// Used by the admin product form (which fields to show), the admin API (what to
// validate) and the storefront (labels, filters). Safe to import anywhere: no
// database or server-only code in here.

export const PRODUCT_TYPES = ["CLOTHING", "BAGS", "JEWELLERY", "NAIL_EXTENSIONS"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && (PRODUCT_TYPES as readonly string[]).includes(value);
}

/** Free-text product attributes stored as columns on the product. */
export type AttributeKey = "color" | "material" | "shape" | "finish" | "dimensions";

export interface AttributeField {
  key: AttributeKey;
  label: string;
  required: boolean;
  placeholder: string;
  /** Quick suggestions in the admin form; any value is still accepted. */
  suggestions?: string[];
  /** Offered as a filter on the storefront. */
  filterable: boolean;
}

export interface SizePresetGroup {
  label: string;
  values: string[];
}

export interface SizeConfig {
  /** "required": at least one size. "optional": admin decides. "none": product has no sizes. */
  mode: "required" | "optional" | "none";
  label: string;
  hint: string;
  presetGroups: SizePresetGroup[];
}

export interface ProductTypeConfig {
  label: string;
  fields: AttributeField[];
  size: SizeConfig;
}

const COLORS = [
  "Black", "White", "Off White", "Beige", "Cream", "Brown", "Tan", "Red", "Maroon", "Pink", "Peach",
  "Orange", "Yellow", "Green", "Olive", "Blue", "Navy", "Purple", "Lavender", "Grey", "Multi",
];

const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const PRODUCT_TYPE_CONFIG: Record<ProductType, ProductTypeConfig> = {
  CLOTHING: {
    label: "Clothing",
    fields: [
      { key: "color", label: "Color", required: true, placeholder: "e.g. Black", suggestions: COLORS, filterable: true },
      {
        key: "material",
        label: "Fabric / Material",
        required: true,
        placeholder: "e.g. Cotton",
        suggestions: ["Cotton", "Linen", "Silk", "Satin", "Denim", "Polyester", "Rayon", "Georgette", "Velvet", "Wool", "Knit", "Fleece"],
        filterable: true,
      },
    ],
    size: {
      mode: "required",
      label: "Size",
      hint: "Add every size you stock and how many pieces of each.",
      presetGroups: [
        { label: "Sizes", values: [...LETTER_SIZES, "Free Size"] },
        { label: "Waist (jeans, bottoms)", values: ["26", "28", "30", "32", "34", "36", "38"] },
      ],
    },
  },
  BAGS: {
    label: "Bags",
    fields: [
      { key: "color", label: "Color", required: true, placeholder: "e.g. Tan", suggestions: COLORS, filterable: true },
      {
        key: "material",
        label: "Material",
        required: true,
        placeholder: "e.g. Vegan Leather",
        suggestions: ["Leather", "Vegan Leather", "Canvas", "Nylon", "Jute", "Cotton", "Suede"],
        filterable: true,
      },
      { key: "dimensions", label: "Size (Dimensions)", required: true, placeholder: "e.g. 30 x 12 x 25 cm (L x W x H)", filterable: false },
    ],
    size: { mode: "none", label: "Size", hint: "", presetGroups: [] },
  },
  JEWELLERY: {
    label: "Jewellery",
    fields: [
      {
        key: "color",
        label: "Color / Finish",
        required: true,
        placeholder: "e.g. Gold",
        suggestions: ["Gold", "Silver", "Rose Gold", "Antique Gold", "Oxidised Silver", "Black Metal", "Pearl White", "Multi"],
        filterable: true,
      },
      {
        key: "material",
        label: "Material",
        required: true,
        placeholder: "e.g. Brass",
        suggestions: ["Brass", "Sterling Silver", "Stainless Steel", "Alloy", "Copper", "Pearl", "Crystal", "Beads"],
        filterable: true,
      },
    ],
    size: {
      mode: "optional",
      label: "Size / Length",
      hint: "Only needed for rings, bangles, bracelets and chains. Leave it off for one-size pieces such as earrings.",
      presetGroups: [
        { label: "Ring size", values: ["6", "7", "8", "9", "10", "11", "12"] },
        { label: "Bangle size", values: ["2.2", "2.4", "2.6", "2.8"] },
        { label: "Length", values: ['14"', '16"', '18"', '20"', '22"', '24"'] },
        { label: "Other", values: ["Adjustable", "Free Size"] },
      ],
    },
  },
  NAIL_EXTENSIONS: {
    label: "Nail Extensions",
    fields: [
      {
        key: "shape",
        label: "Shape",
        required: true,
        placeholder: "e.g. Almond",
        suggestions: ["Almond", "Coffin", "Square", "Squoval", "Oval", "Round", "Stiletto", "Ballerina"],
        filterable: true,
      },
      {
        key: "finish",
        label: "Finish",
        required: true,
        placeholder: "e.g. Glossy",
        suggestions: ["Glossy", "Matte", "Chrome", "Glitter", "Holographic", "Cat Eye", "Ombre", "Pearl"],
        filterable: true,
      },
    ],
    size: {
      mode: "required",
      label: "Size",
      hint: "Use XS / S / M / L, or type a size in mm (e.g. 12 mm).",
      presetGroups: [{ label: "Sizes", values: ["XS", "S", "M", "L", "Free Size"] }],
    },
  },
};

const LETTERS_WITH_FREE: SizePresetGroup[] = [{ label: "Sizes", values: [...LETTER_SIZES, "Free Size"] }];

// Size choices offered in the admin form for each category, so a Top is not
// offered jeans sizes and a Ring is not offered chain lengths. Categories not
// listed here fall back to their department's presets. Any size can still be
// typed in as a custom value.
const CATEGORY_SIZE_PRESETS: Record<string, SizePresetGroup[]> = {
  tops: LETTERS_WITH_FREE,
  dresses: LETTERS_WITH_FREE,
  "co-ord-sets": LETTERS_WITH_FREE,
  winterwear: LETTERS_WITH_FREE,
  bikinis: [{ label: "Sizes", values: ["XS", "S", "M", "L", "XL"] }],
  "bottoms-jeans": [
    { label: "Waist (jeans, trousers)", values: ["26", "28", "30", "32", "34", "36", "38"] },
    { label: "Sizes (skirts, shorts)", values: [...LETTER_SIZES, "Free Size"] },
  ],
  necklaces: [{ label: "Length", values: ['14"', '16"', '18"', '20"', '22"', '24"', "Adjustable"] }],
  earrings: [{ label: "Size", values: ["Free Size"] }],
  rings: [{ label: "Ring size", values: ["6", "7", "8", "9", "10", "11", "12"] }],
  "bracelets-bangles": [{ label: "Bangle / bracelet size", values: ["2.2", "2.4", "2.6", "2.8", "Adjustable"] }],
  "press-on-sets": [{ label: "Sizes", values: ["XS", "S", "M", "L"] }],
  "custom-kits": [{ label: "Sizes", values: ["XS", "S", "M", "L"] }],
};

/** Size presets for a category (by slug), or its department's presets if the category has none of its own. */
export function getSizePresetGroups(type: ProductType, categorySlug?: string): SizePresetGroup[] {
  return (categorySlug && CATEGORY_SIZE_PRESETS[categorySlug]) || PRODUCT_TYPE_CONFIG[type].size.presetGroups;
}

export function getTypeConfig(type: ProductType): ProductTypeConfig {
  return PRODUCT_TYPE_CONFIG[type];
}

/** Attribute keys that are not part of this department's product form. */
export function unusedAttributeKeys(type: ProductType): AttributeKey[] {
  const used = new Set(PRODUCT_TYPE_CONFIG[type].fields.map((f) => f.key));
  return (["color", "material", "shape", "finish", "dimensions"] as const).filter((k) => !used.has(k));
}

/** Trim, collapse spaces and capitalise words so "rose  gold" and "Rose Gold" filter together. */
export function normalizeAttribute(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.replace(/(^|[\s/(-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "FREE SIZE", "FREE", "ADJUSTABLE"];

function sizeRank(size: string): [number, number, string] {
  const upper = size.trim().toUpperCase();
  const letter = SIZE_ORDER.indexOf(upper);
  if (letter !== -1) return [0, letter, upper];
  const num = parseFloat(upper);
  if (!Number.isNaN(num)) return [1, num, upper];
  return [2, 0, upper];
}

/** Sorts size labels sensibly: XS..XXL, then numbers ascending (28, 30, 7, 18"), then anything else. */
export function compareSizes(a: string, b: string): number {
  const [ga, na, sa] = sizeRank(a);
  const [gb, nb, sb] = sizeRank(b);
  if (ga !== gb) return ga - gb;
  if (na !== nb) return na - nb;
  return sa.localeCompare(sb);
}

export interface AttributeInput {
  color?: string | null;
  material?: string | null;
  shape?: string | null;
  finish?: string | null;
  dimensions?: string | null;
  hasVariants: boolean;
  variants: { size: string; stock: number }[];
}

/** Returns a message for the first thing missing from a product, or null when it is complete. */
export function validateProductAttributes(type: ProductType, input: AttributeInput): string | null {
  const config = PRODUCT_TYPE_CONFIG[type];

  for (const field of config.fields) {
    if (field.required && !normalizeAttribute(input[field.key])) {
      return `${field.label} is required for ${config.label.toLowerCase()} products`;
    }
  }

  if (config.size.mode === "required" && (!input.hasVariants || input.variants.length === 0)) {
    return `Add at least one ${config.size.label.toLowerCase()} with its stock for ${config.label.toLowerCase()} products`;
  }
  if (config.size.mode === "none" && input.hasVariants) {
    return `${config.label} products do not have sizes`;
  }

  const seen = new Set<string>();
  for (const v of input.variants) {
    const key = v.size.trim().toLowerCase();
    if (seen.has(key)) return `${config.size.label} "${v.size}" is listed more than once`;
    seen.add(key);
  }
  return null;
}
