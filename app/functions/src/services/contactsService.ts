import { contactsRepo } from "../repositories/contactsRepo";

export type ListParams = {
  q: string | null;
  tag: string | null;
  source_type: string | null;
  state: string | null;
  sort: string;
  order: string;
  page: number;
  page_size: number;
};

export const contactsService = {
  async list(params: ListParams) {
    return await contactsRepo.listContacts(params);
  },

  async create(dto: any) {
    return await contactsRepo.createContact(dto);
  },

  async getBundle(id: string) {
    return await contactsRepo.getContactBundle(id);
  },

  async update(id: string, patch: any) {
    return await contactsRepo.updateContact(id, patch);
  },

  async remove(id: string) {
    return await contactsRepo.deleteContact(id);
  },
};
