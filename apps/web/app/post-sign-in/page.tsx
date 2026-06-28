import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

export default async function PostSignInPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: requestHeaders,
  });

  const activeOrganization = organizations.find(
    (organization) => organization.id === session.session.activeOrganizationId,
  );
  const organization = activeOrganization ?? organizations[0];

  if (organization?.slug) {
    redirect(`/${organization.slug}`);
  }

  redirect("/new-team");
}
