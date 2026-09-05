import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function StudyDisclaimer() {
  return (
    <div
      style={{
        background: '#fef3c7',
        color: '#78350f',
        textAlign: 'center',
        padding: '0.6rem 1rem',
        fontSize: '0.9rem',
        borderBottom: '1px solid #f59e0b',
      }}>
      ⚠️ <strong>Study project</strong> — a personal exercise exploring
      Domain-Driven Design, hexagonal architecture, and micro-frontend
      composition. Not a production system.
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <StudyDisclaimer />
      <div className="container">
        <p className={styles.eyebrow}>warehouse-systems · SPA shell</p>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className={clsx('hero__subtitle', styles.subtitle)}>
          {siteConfig.tagline}
        </p>

        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/overview">
            Read the documentation
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/architecture/module-federation">
            Architecture
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/ecosystem/context-map">
            Context map
          </Link>
        </div>
      </div>
    </header>
  );
}

function WhatItOwns() {
  return (
    <section className={styles.ownership}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <Heading as="h2" className={styles.ownsHeading}>
              What it owns
            </Heading>
            <ul className={styles.ownsList}>
              <li>Routing, top navigation, and the shared design system</li>
              <li>
                The four cross-cutting screens: Floor, Order Lifecycle, WMS
                Dashboard, WES Dashboard
              </li>
              <li>
                Hosting six independently-deployed Module Federation remotes
              </li>
            </ul>
          </div>
          <div className="col col--6">
            <Heading as="h2" className={styles.ownsHeading}>
              What it refuses to own
            </Heading>
            <ul className={styles.ownsList}>
              <li>
                Any bounded-context business logic — that lives in each
                remote's own repo
              </li>
              <li>A shared database — every cross-service view is a REST call</li>
              <li>
                Domain meaning for the reports it renders — it conforms to{' '}
                <code>console-bff</code>'s Published Language
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="The React SPA shell for the warehouse-systems fleet — routing, navigation, the shared design system, and the cross-cutting screens no single bounded context owns.">
      <HomepageHeader />
      <main>
        <WhatItOwns />
      </main>
    </Layout>
  );
}
