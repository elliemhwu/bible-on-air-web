"use client";

import ImageHome from "@/components/studio/images/ImageHome";
import ManagerDashboard from "@/components/studio/manager/ManagerDashboard";
import ReviewWeek from "@/components/studio/review/ReviewWeek";
import MyWork from "@/components/studio/writer/MyWork";
import { useAuth } from "@/lib/auth-context";
import { isImageEditor, isManager, isReviewer, isWriter } from "@/lib/roles";

/** /studio shows each person the home of their role (the first that applies) */
export default function StudioHome({ week }: { week?: string }) {
  const { user } = useAuth();
  if (isManager(user)) return <ManagerDashboard week={week} />;
  if (isWriter(user)) return <MyWork />;
  if (isReviewer(user)) return <ReviewWeek week={week} />;
  if (isImageEditor(user)) return <ImageHome />;
  return <ManagerDashboard week={week} />;
}
