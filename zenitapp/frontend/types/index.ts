export type UserRole = "cliente" | "admin" | "empleado";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type ServiceCategory =
  | "catering"
  | "sonido"
  | "iluminacion"
  | "decoracion"
  | "personal"
  | "mobiliario"
  | "otro";

export interface Service {
  id: number;
  name: string;
  category: ServiceCategory;
  description: string | null;
  unit_price: number;
  price_unit: string;
  stock_total: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type QuoteRequestStatus = "pendiente" | "aprobada" | "rechazada" | "modificada";

export interface QuoteItem {
  id: number;
  service_id: number;
  quantity: number;
  unit_price: number;
  service?: Service;
}

export interface QuoteRequest {
  id: number;
  client_id: number;
  status: QuoteRequestStatus;
  desired_date: string | null;
  guests_count: number | null;
  message: string | null;
  admin_notes: string | null;
  estimated_total: number;
  created_at: string;
  items: QuoteItem[];
}

export type EventStatus = "pendiente" | "confirmado" | "en_curso" | "finalizado" | "cancelado";

export interface EventServiceItem {
  id: number;
  service_id: number;
  quantity: number;
  unit_price: number;
  was_delivered: boolean;
  service?: Service;
}

export interface StaffAssignment {
  id: number;
  event_id: number;
  employee_id: number;
  role_in_event: string | null;
  attended: boolean;
  check_in_time: string | null;
  check_out_time: string | null;
  employee?: User;
}

export interface ZenitEvent {
  id: number;
  client_id: number;
  title: string;
  event_type: string | null;
  event_date: string;
  location: string | null;
  guests_count: number | null;
  status: EventStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  services: EventServiceItem[];
  staff_assignments: StaffAssignment[];
  client?: User;
}

export type EquipmentCondition = "bueno" | "dañado" | "faltante" | "en_mantenimiento";

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  client_id: number;
  created_at: string;
  messages: ChatMessage[];
}

export interface ConversationSummary {
  id: number;
  client_id: number;
  client_name: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  related_id: number | null;
  is_read: boolean;
  created_at: string;
}
