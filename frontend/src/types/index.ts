export type Id = string;

export interface Customer {
  _id: Id;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  tags?: string[];
  totalMessages?: number;
  lastContactAt?: string;
  notes?: string;
}

export interface Deal {
  _id: Id;
  title: string;
  stage: string;
  value: number;
  currency: string;
  quoteSent?: boolean;
  followUpCount?: number;
  customerId?: { _id: Id; name: string; phone?: string } | Id;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export interface KnowledgeDoc {
  _id: Id;
  title: string;
  type: string;
  content: string;
  filename?: string;
  useCount?: number;
  isActive?: boolean;
}

export interface Conversation {
  _id: Id;
  status?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  aiPaused?: boolean;
  customerId?: { _id: Id; name: string; phone?: string };
}

export interface DashboardStats {
  customers?: number;
  conversations?: number;
  deals?: number;
  messagesToday?: number;
  [key: string]: unknown;
}

export interface Paginated<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}
