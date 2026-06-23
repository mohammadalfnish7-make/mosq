import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { StudentProfileView } from "@/components/StudentProfileView";
import { HttpError } from "@/server/http";
import { getAdminStudentProfile } from "@/server/student-profile";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function getBaseUrl() {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : undefined;
}

export default async function AdminStudentPage({ params }: Params) {
  const { id } = await params;

  try {
    const profile = await getAdminStudentProfile(id, getBaseUrl());

    return (
      <div>
        <div className="mx-auto flex max-w-3xl justify-end px-5 pt-4">
          <LogoutButton />
        </div>
        <StudentProfileView
          profile={profile}
          backHref="/admin"
          backLabel="لوحة الإدارة"
          viewer="admin"
          studentId={id}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}
