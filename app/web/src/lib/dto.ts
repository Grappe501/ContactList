// DTO placeholders. In later overlays, generate these from OpenAPI.
export type ContactListItem = {
  id: string;
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  city: string | null;
  state: string | null;
  tag_names: string[];
  source_types: string[];
  updated_at: string;
};

export type PaginatedContacts = {
  data: ContactListItem[];
  page: number;
  page_size: number;
  total: number;
};
