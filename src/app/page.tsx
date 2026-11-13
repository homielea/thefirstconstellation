import { redirect } from "next/navigation";
import { brand } from "@/brand";
import { listMyWorkspaces } from "@/server/auth/auth";
import { currentUser } from "@/server/web";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

const LINK_MESSAGES: Record<string, string> = {
  invalid: "That sign-in link is not valid. Request a new one.",
  expired: "That sign-in link has expired. Links last 15 minutes.",
  used: "That sign-in link was already used. Request a new one.",
  no_workspace: "You are signed in, but you are not a member of any constellation yet. Ask its owner to invite you.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const user = await currentUser();
  const { link } = await searchParams;
  if (user && link !== "no_workspace") {
    const ws = await listMyWorkspaces(user.id);
    if (ws[0]) redirect(`/c/${ws[0].slug}`);
  }
  return (
    <main id="content" className="signin">
      <p className="display">{brand.productName}</p>
      <h1 tabIndex={-1}>Sign in</h1>
      <p className="muted">{brand.tagline} This is an early build: please use sample information.</p>
      {link && LINK_MESSAGES[link] && <p className="notice error" role="alert">{LINK_MESSAGES[link]}</p>}
      <SignInForm />
    </main>
  );
}
