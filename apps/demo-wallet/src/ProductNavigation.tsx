type ProductPage = "demo" | "inspector" | "evidence" | "interview";

/** Plain links work without routing state and preserve the configured deploy base. */
export function ProductNavigation({ active }: { active: ProductPage }) {
  const base = import.meta.env.BASE_URL;
  const links = [
    { key: "intro", href: "gioi-thieu.html", label: "Giới thiệu" },
    { key: "demo", href: "", label: "Ví mẫu" },
    { key: "inspector", href: "soi.html", label: "Inspector" },
    { key: "evidence", href: "so-lieu.html", label: "Số liệu" },
  ];
  return <nav className="product-navigation" aria-label="Điều hướng Custos">
    {links.map(link => <a key={link.key} href={`${base}${link.href}`} aria-current={active === link.key ? "page" : undefined}>{link.label}</a>)}
  </nav>;
}

export function ProductHeader({ active, label }: { active: ProductPage; label: string }) {
  return <header className="product-header">
    <a className="product-brand" href={`${import.meta.env.BASE_URL}gioi-thieu.html`}>
      <img src={`${import.meta.env.BASE_URL}brand/custos-symbol.svg`} width="36" height="36" alt="" />
      <span>Custos <small>{label}</small></span>
    </a>
    <ProductNavigation active={active} />
  </header>;
}
