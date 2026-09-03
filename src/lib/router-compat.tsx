/**
 * Router-compat shim — bridges @/lib/router-compat v6 call sites to
 * @tanstack/react-router without hand-rewriting every component.
 */
import {
  useNavigate as tsNavigate,
  useLocation as tsLocation,
  useParams as tsParams,
  useRouter,
  Link as TSLink,
  Navigate as TSNavigate,
  Outlet as TSOutlet,
} from "@tanstack/react-router";
import {
  useMemo,
  useCallback,
  forwardRef,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";

// ---------- shared URL parsing ----------

function parseTo(to: string): { pathname: string; search?: Record<string, string>; hash?: string } {
  const [beforeHash, hashStr] = (to ?? "").split("#");
  const [pathname, searchStr] = (beforeHash ?? "").split("?");
  return {
    // react-router keeps the current path for search-only ("?a=1") and
    // hash-only ("#section") targets; TanStack's "." means current route.
    pathname: pathname || ".",
    search: searchStr ? Object.fromEntries(new URLSearchParams(searchStr)) : undefined,
    hash: hashStr || undefined,
  };
}

// ---------- useNavigate ----------

type NavigateOptions = { replace?: boolean; state?: unknown };

type NavigateFn = {
  (to: string | number, options?: NavigateOptions): void;
  (delta: number): void;
};

export function useNavigate(): NavigateFn {
  const tsNav = tsNavigate();
  const router = useRouter();
  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      const { pathname, search, hash } = parseTo(to);
      tsNav({
        to: pathname,
        search: search as never,
        hash,
        state: options?.state as never,
        replace: options?.replace,
      });
    },
    [tsNav, router],
  ) as NavigateFn;
}

// ---------- useLocation ----------

export function useLocation() {
  const loc = tsLocation();
  return useMemo(
    () => ({
      pathname: loc.pathname,
      search: loc.searchStr ? `?${loc.searchStr}` : "",
      hash: loc.hash ?? "",
      state: (loc.state ?? null) as unknown,
      key: loc.pathname + (loc.searchStr ?? ""),
    }),
    [loc.pathname, loc.searchStr, loc.hash, loc.state],
  );
}

// ---------- useParams ----------

export function useParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>,
>(): T {
  return tsParams({ strict: false } as never) as T;
}

// ---------- useSearchParams (@/lib/router-compat compat) ----------

export function useSearchParams(): [
  URLSearchParams,
  (
    init: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void,
] {
  const loc = tsLocation();
  const nav = tsNavigate();
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(loc.searchStr ?? ""), [loc.searchStr]);
  const setParams = useCallback(
    (
      init: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      opts?: { replace?: boolean },
    ) => {
      // Functional updaters read the router's live location, not the render
      // snapshot — react-router passes call-time params, and chained updates
      // within one tick must see each other's writes.
      const live = router.state.location;
      const current = new URLSearchParams(live.searchStr ?? "");
      const next =
        typeof init === "function"
          ? init(current)
          : init instanceof URLSearchParams
            ? init
            : new URLSearchParams(init);
      const searchObj: Record<string, string> = {};
      next.forEach((v, k) => {
        searchObj[k] = v;
      });
      nav({ to: live.pathname, search: searchObj as never, replace: opts?.replace });
    },
    [nav, router],
  );
  return [params, setParams];
}

// ---------- Link ----------

type LinkProps = Omit<ComponentProps<typeof TSLink>, "to"> & {
  to: string;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, children, ...rest },
  ref,
) {
  const { pathname, search, hash } = parseTo(to);
  return (
    <TSLink
      ref={ref as never}
      to={pathname as never}
      search={search as never}
      hash={hash}
      replace={replace}
      state={state as never}
      {...((rest ?? {}) as Record<string, unknown>)}
    >
      {children}
    </TSLink>
  );
});

// ---------- Navigate ----------

export function Navigate({
  to,
  replace,
  state,
}: {
  to: string;
  replace?: boolean;
  state?: unknown;
}) {
  const { pathname, search, hash } = parseTo(to);
  return (
    <TSNavigate
      to={pathname as never}
      search={search as never}
      hash={hash}
      state={state as never}
      replace={replace}
    />
  );
}

// ---------- Outlet ----------

export const Outlet = TSOutlet;

// ---------- NavLink (@/lib/router-compat compat) ----------

export type NavLinkRenderProps = { isActive: boolean; isPending: boolean };

export type NavLinkProps = Omit<LinkProps, "className" | "style" | "children"> & {
  end?: boolean;
  className?: string | ((props: NavLinkRenderProps) => string | undefined);
  style?: CSSProperties | ((props: NavLinkRenderProps) => CSSProperties | undefined);
  children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const loc = tsLocation();
  const toPath = parseTo(to).pathname;
  const normalized = toPath.length > 1 && toPath.endsWith("/") ? toPath.slice(0, -1) : toPath;
  const pathname = loc.pathname;
  const isActive = end
    ? pathname === normalized || pathname === `${normalized}/`
    : pathname === normalized || pathname.startsWith(normalized === "/" ? "/" : `${normalized}/`);
  const render: NavLinkRenderProps = { isActive, isPending: false };
  return (
    <Link
      ref={ref}
      to={to}
      className={typeof className === "function" ? className(render) : className}
      style={typeof style === "function" ? style(render) : style}
      aria-current={isActive ? "page" : undefined}
      {...(rest as Record<string, unknown>)}
    >
      {typeof children === "function" ? children(render) : children}
    </Link>
  );
});
