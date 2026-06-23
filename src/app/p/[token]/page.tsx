import { notFound } from "next/navigation";
import { StudentProfileView } from "@/components/StudentProfileView";
import { HttpError } from "@/server/http";
import { getGuardianStudentProfile } from "@/server/student-profile";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export default async function GuardianStudentPage({ params }: Params) {
  const { token } = await params;

  try {
    const profile = await getGuardianStudentProfile(token);
    return <StudentProfileView profile={profile} viewer="guardian" />;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}
