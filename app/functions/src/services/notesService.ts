import { notesRepo } from "../repositories/notesRepo";

export const notesService = {
  async list(contactId: string) {
    return await notesRepo.list(contactId);
  },
  async create(contactId: string, dto: any) {
    return await notesRepo.create(contactId, dto);
  },
};
