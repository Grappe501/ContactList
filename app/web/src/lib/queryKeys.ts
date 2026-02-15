export const qk = {
  contacts: (params: Record<string, unknown>) => ["contacts", params] as const,
  tags: () => ["tags"] as const,
  contact: (id: string) => ["contact", id] as const,
  batches: () => ["batches"] as const,
};
