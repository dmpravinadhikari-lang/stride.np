import { BrandMark } from "@/components/BrandMark";
import { currentBrand } from "@/lib/tenancy/branch";

/**
 * The mark, resolved for whichever address the page was opened at: STRIDE's
 * wordmark on the apex, the consultancy's own on their subdomain.
 *
 * Reading the host makes any route that renders this dynamic — which is the
 * price of the page saying a different name depending on where it was asked
 * for, and is why the lookup is cached per request.
 *
 * A client component cannot await this. Those take `BrandMark` directly, with
 * the branch handed down from the nearest server component.
 */
export async function Logo({
  href = "/",
  tone = "dark",
  size = 19,
}: {
  href?: string;
  tone?: "dark" | "light";
  size?: number;
}) {
  const branch = await currentBrand();
  return <BrandMark href={href} tone={tone} size={size} branch={branch} />;
}
