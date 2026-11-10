import { ArrowLeft } from 'lucide-react';
import { CONTACT_URL, LEGAL, LEGAL_UPDATED } from '../content/legal';
import type { LangCode } from '../domain/types';

/** Works with or without a chosen course, so it can be read before signing up. */
export function Legal({ lang }: { lang: LangCode }) {
  const sections = LEGAL[lang === 'de' ? 'de' : 'en'];
  const linkify = (text: string) =>
    text.split(CONTACT_URL).flatMap((part, i) =>
      i === 0
        ? [part]
        : [
            <a key={i} href={CONTACT_URL} target="_blank" rel="noreferrer">
              {CONTACT_URL}
            </a>,
            part,
          ],
    );
  return (
    <div className="page legal-page">
      <a className="legal-back" href="#/">
        <ArrowLeft size={18} /> Ohrly
      </a>
      <h1 className="page-title">{lang === 'de' ? 'Rechtliches' : 'Legal'}</h1>
      <nav className="legal-toc">
        {sections.map((s) => (
          <a key={s.id} href={`#/legal`} onClick={(e) => {
            e.preventDefault();
            document.getElementById(`legal-${s.id}`)?.scrollIntoView({ behavior: 'smooth' });
          }}>
            {s.title}
          </a>
        ))}
      </nav>
      {sections.map((s) => (
        <section key={s.id} id={`legal-${s.id}`} className="legal-section">
          <h2>{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i}>{linkify(p)}</p>
          ))}
        </section>
      ))}
      <p className="muted">{lang === 'de' ? `Stand: ${LEGAL_UPDATED}` : `Last updated: ${LEGAL_UPDATED}`}</p>
    </div>
  );
}
