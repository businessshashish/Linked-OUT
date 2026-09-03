type Section = { title: string; body: string[] };

export default function TrustPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: Section[] }) {
  return <div className="narrowContainer trustPage"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lead">{intro}</p>{sections.map((section) => <section className="panel" key={section.title}><h2>{section.title}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</div>;
}
