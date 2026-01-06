export class RoomModel {
  declare id: string;
  declare companyId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare expiresAt: Date;
  declare token: string;
  declare callId?: string | null;
}
