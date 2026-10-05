import { createFileRoute } from "@tanstack/react-router";
import { SupportOverviewPage } from "@/components/support/SupportPages";

export const Route = createFileRoute("/support/")({ component: SupportOverviewPage });
