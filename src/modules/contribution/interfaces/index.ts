export interface IDonationResponse {
  donation: {
    campaign: {
      name: string;
    };
    value: number;
    createdAt: Date;
    updatedAt: Date;
  };
}
