import { Link as RouterDomLink } from "react-router-dom";
import type { LinkProps, LinkComponent } from "@warehouse/ui-kit";
import type { ReactElement } from "react";

/**
 * Adapts react-router's Link to the ui-kit's router-agnostic LinkProps
 * contract (`href` in, a real anchor out).
 *
 * Declared at MODULE SCOPE on purpose. React identifies a component by its
 * function identity, so defining this inline in JSX would mint a new
 * component type on every render and remount every link in the tree.
 *
 * External and protocol-relative links fall through to a plain anchor:
 * handing react-router an absolute URL would make it push a nonsense
 * client-side route instead of leaving the app.
 */
export const RouterLink: LinkComponent = ({
  href,
  children,
  ...rest
}: LinkProps): ReactElement => {
  const isExternal = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
  if (isExternal) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <RouterDomLink to={href} {...rest}>
      {children}
    </RouterDomLink>
  );
};
