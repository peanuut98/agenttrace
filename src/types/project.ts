export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  github_url: string | null;
  demo_url: string | null;
  wallet_address: string | null;
  chain: string | null;
  created_at: string;
  updated_at: string;
};

export type NewProjectInput = {
  name: string;
  description?: string | null;
  github_url?: string | null;
  demo_url?: string | null;
  wallet_address?: string | null;
  chain?: string | null;
};
