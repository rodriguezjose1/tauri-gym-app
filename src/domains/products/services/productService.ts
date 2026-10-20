import { invoke } from '@tauri-apps/api/core';

export interface Product {
  id?: number;
  name: string;
  category: string;
  sale_price_cents: number;
  is_active: boolean;
  available_stock: number;
}

export interface StockReceipt {
  quantity: number;
  unit_cost_cents: number;
  received_at?: string;
}

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const ProductService = {
  page: (query = '', page = 1, pageSize = 8) =>
    invoke<ProductPage>('get_products_page', { query, page, pageSize }),
  save: (product: Product, initialStock?: StockReceipt) =>
    invoke<Product>('save_product', { request: { product, initial_stock: initialStock } }),
  receiveStock: (productId: number, receipt: StockReceipt) =>
    invoke<void>('receive_product_stock', { productId, receipt }),
};
