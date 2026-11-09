import { useMemo, useState } from 'react';
import { Fenn } from '../components/Fenn';
import { Btn, SpeakerButton } from '../components/ui';
import { strength } from '../domain/srs';
import type { Course, Unit, Word } from '../domain/types';
import type { Translate } from '../i18n';
import { navigate } from '../router';
import { useProgress } from '../state/store';

interface WordGroup {
  unit: Unit;
  words: Word[];
}

export function WordList({ course, t }: { course: Course; t: Translate }) {
  const { cards } = useProgress(course.id);
  const [query, setQuery] = useState('');
  const met = Object.keys(cards).length;
  const groups = useMemo<WordGroup[]>(() => {
    const needle = query.trim().toLocaleLowerCase(course.from);
    return course.sections.flatMap((section) =>
      section.units
        .map((unit) => ({
          unit,
          words: unit.words.filter(
            (word) =>
              cards[word.id] &&
              (!needle ||
                word.target.toLocaleLowerCase(course.to).includes(needle) ||
                word.source.toLocaleLowerCase(course.from).includes(needle)),
          ),
        }))
        .filter((group) => group.words.length > 0),
    );
  }, [cards, course, query]);

  if (met === 0) {
    return (
      <div className="empty-state">
        <Fenn mood="think" size={130} />
        <h2>{t('navWords')}</h2>
        <p>{t('wordsEmpty')}</p>
        <Btn onClick={() => navigate('/')}>{t('navLearn')}</Btn>
      </div>
    );
  }

  const now = Date.now();
  return (
    <div className="page word-page">
      <div className="word-head">
        <div>
          <h1 className="page-title">{t('navWords')}</h1>
          <p>{t('wordsMetCount', { n: met })}</p>
        </div>
        <label className="word-search">
          <span className="sr-only">{t('searchWords')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t('searchWords')}
          />
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="word-no-results">{t('noWordResults')}</p>
      ) : (
        <div className="word-groups">
          {groups.map(({ unit, words }) => (
            <section className="word-group" key={unit.id}>
              <h2>{unit.title}</h2>
              <div className="word-list">
                {words.map((word) => {
                  const bars = strength(cards[word.id], now);
                  return (
                    <div className="word-row" key={word.id}>
                      <SpeakerButton text={word.target} lang={course.to} size="sm" />
                      <span className="word-pair">
                        <strong>{word.target}</strong>
                        <span>{word.source}</span>
                      </span>
                      <span className="strength" aria-label={t('wordStrength', { n: bars })}>
                        {[1, 2, 3, 4].map((bar) => (
                          <span key={bar} className={bar <= bars ? 'is-on' : ''} />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
