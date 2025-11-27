import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Experience } from "@shared/schema";

interface UseExperienceSearchOptions {
  limit?: number;
  queryKeyPrefix?: string;
}

export function useExperienceSearch(options: UseExperienceSearchOptions = {}) {
  const { limit, queryKeyPrefix = 'default' } = options;
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const { data: allExperiences = [], isLoading } = useQuery<Experience[]>({
    queryKey: [queryKeyPrefix, '/api/experiences', searchQuery],
    queryFn: async () => {
      const searchParams = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/experiences${searchParams}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch experiences");
      return res.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  const experiences = limit ? allExperiences.slice(0, limit) : allExperiences;

  const clearSearch = () => setSearchQuery("");

  return {
    searchQuery,
    setSearchQuery,
    experiences,
    totalCount: allExperiences.length,
    isLoading,
    clearSearch,
  };
}
