"use client";

import WeekImageUploader from "@/components/studio/WeekImageUploader";
import { use } from "react";

type Props = {
  params: Promise<{ weekStart: string }>;
};

export default function WeekImagesPage({ params }: Props) {
  const { weekStart } = use(params);
  return <WeekImageUploader weekStart={weekStart} />;
}
