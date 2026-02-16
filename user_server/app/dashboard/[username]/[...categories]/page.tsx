"use client";

import { useParams } from "next/navigation";
import { useContext } from "react";
import { DataContext } from "../layout";
import { DashboardContent } from "@/Component/Dashboard/Feed";

export default function CategoryPage() {
  const data = useContext(DataContext);
  if (data === null) return <div>Loading...</div>;
  if (!data?.videos) return <div>No content</div>;
  return <DashboardContent videos={data.videos} />;
}
