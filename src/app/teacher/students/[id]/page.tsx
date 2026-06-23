import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { StudentProfileView } from "@/components/StudentProfileView";
import { getBaseUrl } from "@/lib/base-url";
import { HttpError } from "@/server/http";
import { getTeacherStudentProfile } from "@/server/student-profile";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function TeacherStudentPage({ params }: Params) {
  const { id } = await params;

  try {
    const profile = await getTeacherStudentProfile(id, await getBaseUrl());

    return (
      <div>
        <div className="mx-auto flex max-w-3xl justify-end px-5 pt-4">
          <LogoutButton />
        </div>
        <StudentProfileView
          profile={profile}
          backHref="/teacher"
          backLabel="واجهة المعلم"
          viewer="teacher"
          studentId={id}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}
