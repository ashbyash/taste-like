import type { BrandTier, Category, Gender, Subcategory } from './brand';

export interface Product {
  id: string;
  brand: string;
  brand_tier: BrandTier;
  name: string;
  price: number;
  currency: string;
  category: Category;
  subcategory: Subcategory | null;
  gender: Gender;
  image_url: string;
  product_url: string;
  embedding: number[] | null;
  is_available: boolean;
  crawled_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScrapedProduct {
  brand: string;
  name: string;
  price: number;
  currency: string;
  category: Category;
  subcategory?: Subcategory | null;
  gender: Gender;
  image_url: string;
  product_url: string;
  description?: string;
}

export interface RecommendationResult {
  source: ScrapedProduct;
  recommendations: RecommendedItem[];
}

export interface RecommendedItem {
  id: string;
  brand: string;
  name: string;
  price: number;
  category: Category;
  image_url: string;
  product_url: string;
  similarity: number;
  savings_percent: number;
}
