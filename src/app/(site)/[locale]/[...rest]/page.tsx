import { notFound } from "next/navigation";

/** Any unknown address on the public site: the 404 page within the site, in its language. */
export default function UnknownPage(): never {
  notFound();
}
