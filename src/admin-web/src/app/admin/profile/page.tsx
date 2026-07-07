import { serverApiFetch } from "@/lib/server-api";
import { UserProfile } from "@/lib/api";
import {
  AdminHero,
  AdminPanel,
  AdminPanelTitle,
  AdminStatusBadge,
} from "@/components/admin-ui";
import { UserIcon } from "@/components/icons";

async function getProfile() {
  try {
    return await serverApiFetch<UserProfile>("/auth/me");
  } catch (error) {
    return null;
  }
}

export default async function ProfilePage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="space-y-8">
        <AdminHero
          eyebrow="Organizer workspace"
          title="Profile"
          description="Manage your TicketBox administrator profile and workspace credentials."
        />
        <AdminPanel>
          <p className="text-sm font-semibold text-red-500">
            Failed to load profile information. Please try logging in again.
          </p>
        </AdminPanel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminHero
        eyebrow="Organizer workspace"
        title="Admin Profile"
        description="Manage your TicketBox administrator profile and workspace credentials."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <AdminPanel className="md:col-span-1 flex flex-col items-center justify-center text-center p-8">
          <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-ticket-green bg-ticket-stone shadow-inner">
            <UserIcon className="h-12 w-12 text-slate-400" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-black tracking-tight text-ticket-obsidian">
            {profile.fullName}
          </h2>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-ticket-green">
            {profile.role}
          </p>
          <div className="mt-4">
            <AdminStatusBadge status="active" />
          </div>
        </AdminPanel>

        <AdminPanel className="md:col-span-2">
          <AdminPanelTitle
            title="Account details"
            description="Official administrator details registered for this TicketBox organization."
          />

          <div className="mt-6 space-y-6 divide-y divide-black/10">
            <div className="pt-0">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                User ID
              </span>
              <div className="mt-1.5">
                <code className="font-mono text-xs text-ticket-obsidian bg-ticket-stone/50 px-3 py-2 rounded border border-black/5 inline-block select-all">
                  {profile.id}
                </code>
              </div>
            </div>

            <div className="pt-6">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Full Name
              </span>
              <p className="mt-1 text-base font-bold text-ticket-obsidian">
                {profile.fullName}
              </p>
            </div>

            <div className="pt-6">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Email Address
              </span>
              <p className="mt-1 text-base font-bold text-ticket-obsidian">
                {profile.email}
              </p>
            </div>

            <div className="pt-6">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Workspace Role
              </span>
              <p className="mt-1 text-base font-bold text-ticket-obsidian capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
