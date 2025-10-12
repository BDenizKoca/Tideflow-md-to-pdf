import React from 'react';
import './AboutTab.css';

const AboutTab: React.FC = () => {
  return (
    <div className="tab-panel about-tab">
      <h3>You are using the Tideflow free version</h3>

      <p className="about-description">
        This version includes every feature you need for a powerful and focused writing experience.
      </p>

      <p className="about-description">
        The <strong>only difference</strong> between the free and Pro versions is the <strong>Batch Export</strong> feature.
      </p>

      <p className="about-description">
        Some of the core features include:
      </p>

      <ul className="features-list">
        <li>
          <strong>Live PDF Preview:</strong> See your formatted document update in real-time as you type.
        </li>
        <li>
          <strong>Advanced Theming Engine:</strong> Take full control of your document's appearance with customizable themes, fonts, cover pages, and a table of contents.
        </li>
        <li>
          <strong>Offline and Private:</strong> Your files stay on your machine, always.
        </li>
      </ul>

      <div className="about-section">
        <h4>Upgrade to Pro</h4>
        <p>
          For users who work with multiple documents, Tideflow Pro unlocks the powerful Batch Export feature for a single, one-time payment.
        </p>
        <div className="about-actions">
          <a
            href="https://github.com/BDenizKoca"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Buy Tideflow Pro for $10
          </a>
          <a
            href="https://tideflow.bdenizkoca.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Learn more at tideflow.bdenizkoca.studio
          </a>
        </div>
      </div>

      <div className="about-section">
        <h4>Support the Project</h4>
        <p>
          If you enjoy the free version and just want to say thanks, you can support my work through GitHub Sponsors. This not only helps the development of Tideflow but helps me in all my future creative endeavours.
        </p>
        <div className="about-actions">
          <a
            href="https://github.com/sponsors/BDenizKoca"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Support via GitHub Sponsors
          </a>
        </div>
      </div>

      <div className="about-footer">
        <div className="about-links">
          <a
            href="https://github.com/BDenizKoca/Tideflow-md-to-pdf/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check for new releases on GitHub
          </a>
          {' • '}
          <a
            href="https://github.com/BDenizKoca/Tideflow-md-to-pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            View the source code on GitHub
          </a>
        </div>
        <div className="about-credits">
          Developed by Burak Deniz Koca (
          <a
            href="https://github.com/BDenizKoca"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          {' • '}
          <a
            href="https://bdenizkoca.studio"
            target="_blank"
            rel="noopener noreferrer"
          >
            Personal Site
          </a>
          )
        </div>
      </div>
    </div>
  );
};

export default AboutTab;
