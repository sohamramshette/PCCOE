import React from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

export interface NextLinkProps extends Omit<RouterLinkProps, 'to'> {
  href: string;
}

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(({ href, children, ...props }, ref) => {
  return (
    <RouterLink to={href} ref={ref} {...props}>
      {children}
    </RouterLink>
  );
});

Link.displayName = 'NextLinkShim';

export default Link;
