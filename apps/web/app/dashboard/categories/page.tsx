'use client';

import { AICategorization } from '@/components/categories/AICategorization';

/**
 * AI Categorization Page
 *
 * Accessible from sidebar "Categorizzazione AI".
 * Reviews uncategorized transactions with AI suggestions.
 * Category CRUD management is in Settings → Categorie tab.
 */
export default function CategoriesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <AICategorization />
    </div>
  );
}
