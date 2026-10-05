import { createFileRoute } from "@tanstack/react-router";
import { NoticeDetailPage } from "@/components/about/AboutExperience";
import { getNotice } from "@/data/noticeData";
export const Route = createFileRoute("/about/notices/$noticeId")({ component: Page });
function Page() {
  const { noticeId } = Route.useParams();
  return <NoticeDetailPage notice={getNotice(noticeId)} />;
}
