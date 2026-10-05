import { createFileRoute } from "@tanstack/react-router";
import { SupportTicketPage } from "@/components/support/SupportPages";

export const Route = createFileRoute("/support/tickets")({ component: SupportTicketPage });
