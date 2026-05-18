"use server";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { searchAll, type SearchResult } from "@/lib/domain/search";

export async function searchAction(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  const { organizationId } = await requireActiveOrganization();
  return searchAll({ organizationId, query, limit: 6 });
}
