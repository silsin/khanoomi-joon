/**
 * Map SQLite snake_case rows to the camelCase shapes expected by admin UI.
 */

import { parseVariants, parseSpecs } from "./product-variants";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  address: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  recipient_first_name?: string | null;
  recipient_last_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  province?: string | null;
  county?: string | null;
  postal_code?: string | null;
  delivery_phone?: string | null;
};

type OrderItemRow = {
  id: string;
  quantity: number;
  price: number;
  product_name?: string | null;
  product_images?: string | null;
  variant_weight?: number | null;
  gift_pack?: string | null;
  postcard?: string | null;
};

function shippingFields(row: OrderRow) {
  return {
    recipientFirstName: row.recipient_first_name ?? "",
    recipientLastName: row.recipient_last_name ?? "",
    recipientPhone: row.recipient_phone ?? "",
    recipientEmail: row.recipient_email ?? "",
    province: row.province ?? "",
    county: row.county ?? "",
    postalCode: row.postal_code ?? "",
    deliveryPhone: row.delivery_phone ?? "",
  };
}

export function serializeOrder(row: OrderRow) {
  return {
    id: row.id,
    status: row.status,
    total: row.total,
    address: row.address ?? "",
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    ...shippingFields(row),
    user: {
      name: row.user_name ?? "—",
      email: row.user_email ?? "",
      phone: row.user_phone ?? null,
    },
  };
}

export function serializeOrderDetail(
  order: OrderRow & { items?: OrderItemRow[] }
) {
  return {
    ...serializeOrder(order),
    items: (order.items ?? []).map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      variantWeight: item.variant_weight ?? null,
      giftPack: item.gift_pack ?? null,
      postcard: item.postcard ?? null,
      product: {
        name: item.product_name ?? "—",
        images: item.product_images ?? "[]",
      },
    })),
  };
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  phone_login?: string | null;
  role: string;
  created_at: string;
  order_count?: number;
};

export function serializeUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? null,
    phone_login: row.phone_login ?? null,
    role: row.role,
    created_at: row.created_at,
    order_count: row.order_count ?? 0,
    // legacy camelCase kept for any existing code
    createdAt: row.created_at,
    _count: { orders: row.order_count ?? 0 },
  };
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  product_count?: number;
  parent_id?: string | null;
  parent_name?: string | null;
  child_count?: number;
};

export function serializeCategory(row: CategoryRow) {
  const count = row.product_count ?? 0;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    image: row.image ?? null,
    product_count: count,
    _count: { products: count },
    // Tree support: null parent = top-level category
    parent_id: row.parent_id ?? null,
    parent_name: row.parent_name ?? null,
    child_count: row.child_count ?? 0,
  };
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  weight: number;
  karat: number;
  stock: number;
  images: string;
  videos?: string;
  featured: number;
  published: number;
  express_shipping?: number;
  low_wage?: number;
  coin?: number;
  new_arrival?: number;
  variants?: string | null;
  specs?: string | null;
  ajrat_override: number;
  ajrat_percent: number | null;
  ajrat_fixed: number | null;
  fixed_price?: number;
  category_name?: string | null;
  category_slug?: string | null;
};

export function serializeProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    price: row.price,
    weight: row.weight,
    karat: row.karat,
    stock: row.stock,
    images: row.images,
    videos: row.videos ?? "[]",
    featured: row.featured === 1,
    published: row.published === 1,
    express_shipping: row.express_shipping ?? 0,
    low_wage: row.low_wage ?? 0,
    coin: row.coin ?? 0,
    new_arrival: row.new_arrival ?? 0,
    variants: parseVariants(row.variants),
    specs: parseSpecs(row.specs),
    ajrat_override: row.ajrat_override,
    ajrat_percent: row.ajrat_percent,
    ajrat_fixed: row.ajrat_fixed,
    // «قیمت ثابت» lock — when 1 this product keeps its stored base even if the
    // site-wide live pricing is on (see lib/pricing.ts calcEffectiveBase).
    fixed_price: row.fixed_price ?? 0,
    category: row.category_name
      ? { name: row.category_name, slug: row.category_slug ?? "" }
      : null,
  };
}

type ProductReviewRow = {
  id: string;
  product_id: string;
  user_id?: string | null;
  name: string;
  rating: number;
  body: string;
  status: string;
  created_at: string;
  product_name?: string | null;
  product_slug?: string | null;
};

export function serializeReview(row: ProductReviewRow) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    rating: row.rating,
    body: row.body,
    status: row.status,
    // SQLite stores datetime('now') as "YYYY-MM-DD HH:MM:SS" (UTC) — hand the
    // client a parseable ISO string.
    createdAt: row.created_at
      ? (row.created_at.includes("T") ? row.created_at : `${row.created_at.replace(" ", "T")}Z`)
      : row.created_at,
    product: row.product_name
      ? { name: row.product_name, slug: row.product_slug ?? "" }
      : null,
  };
}
