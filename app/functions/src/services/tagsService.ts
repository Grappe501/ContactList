import { tagsRepo } from "../repositories/tagsRepo";

export const tagsService = {
  async list() {
    return await tagsRepo.list();
  },
  async upsert(dto: any) {
    return await tagsRepo.upsert(dto);
  },
  async assign(contactId: string, dto: any) {
    return await tagsRepo.assign(contactId, dto);
  },
  async remove(contactId: string, tagId: string) {
    return await tagsRepo.remove(contactId, tagId);
  },
};
