import { useId, useRef, useState, type ReactNode } from "react";
import { ExternalIcon } from "./Icons.tsx";
import { ResourceIllustration } from "./landing/InspectionArtwork.tsx";
import { LINK } from "./landing/links.ts";

type ProductPage = "demo" | "inspector" | "integration" | "evidence" | "interview";

const links = [
  { key: "intro", href: "gioi-thieu.html", label: "About" },
  { key: "demo", href: "index.html", label: "Custos Wallet" },
  { key: "integration", href: "tich-hop.html", label: "Integration" },
  { key: "inspector", href: "soi.html", label: "Inspector" },
  { key: "evidence", href: "so-lieu.html", label: "Evidence" },
];

export function ProductHeader({ active, label }: { active: ProductPage; label: string }) {
  const [open, setOpen] = useState(false);
  const menu = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const base = import.meta.env.BASE_URL;

  return (
    <header className="workspace-header" onKeyDown={event => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="workspace-width workspace-header__inner">
        <a className="workspace-brand" href={base + "gioi-thieu.html"} aria-label="Custos — About">
          <img src={base + "brand/custos-symbol-light.svg"} alt="" width="38" height="38" />
          <span><strong>Custos</strong><small>{label}</small></span>
        </a>
        <button type="button" className="workspace-menu" ref={toggle} aria-expanded={open}
          aria-controls={menu} onClick={() => setOpen(value => !value)}>
          Menu <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        <nav id={menu} className="workspace-links" data-open={open} aria-label="Custos navigation">
          {links.map(link => <a key={link.key} href={base + link.href}
            aria-current={active === link.key ? "page" : undefined}>{link.label}</a>)}
          <a className="workspace-demo" href={LINK.solBonus} target="_blank" rel="noopener noreferrer">
            SolBonus demo <small>Simulated</small><ExternalIcon />
            <span className="sr-only">Malicious dApp on Devnet, opens in a new tab</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

const illustration = { demo: 0, integration: 1, inspector: 2, evidence: 3, interview: 0 };

export function ProductIntro({ page, context, title, children }: {
  page: ProductPage;
  context: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`workspace-intro workspace-intro--${page}`} aria-labelledby="workspace-title">
      <div className="workspace-width workspace-intro__inner">
        <div className="workspace-intro__title">
          <p>{context}</p>
          <h1 id="workspace-title">{title}</h1>
        </div>
        <div className="workspace-art" aria-hidden="true">
          <ResourceIllustration index={illustration[page]} />
        </div>
        <div className="workspace-intro__details">{children}</div>
      </div>
    </section>
  );
}
