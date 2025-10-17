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
        <h4>Want even more?</h4>
        <p>
          Unlock a couple of extra powers with a <strong>one-time Tideflow Pro purchase</strong>:
        </p>
        <ul className="features-list">
          <li>
            <strong>Batch Export:</strong> Export multiple documents at once for max productivity.
          </li>
          <li>
            <strong>Import/Export Presets:</strong> Bring your custom themes anywhere, or share them with friends.
          </li>
        </ul>
        <div className="about-actions">
          <a
            href="https://github.com/BDenizKoca"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Get Tideflow Pro ($10)
          </a>
          <a
            href="https://tideflow.bdenizkoca.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            See all Pro details
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
