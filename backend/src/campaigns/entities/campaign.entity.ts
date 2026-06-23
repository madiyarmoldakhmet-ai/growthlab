export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}
