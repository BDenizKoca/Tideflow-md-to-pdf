import React from 'react';
import './AboutTab.css';
import { openExternal } from '../../utils/openExternal';

const AboutTab: React.FC = () => {
  const handleExternalLink = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    openExternal(url);
  };

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
          <strong>Multiple Export Formats:</strong> Export your documents as PDF, high-quality PNG images, or scalable SVG vectors.
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
          <button
            onClick={handleExternalLink('https://payhip.com/b/TmIMF')}
            className="btn-primary"
          >
            Get Tideflow Pro ($10)
          </button>
          <button
            onClick={handleExternalLink('https://tideflow.bdenizkoca.studio')}
            className="btn-secondary"
          >
            See all Pro details
          </button>
        </div>
      </div>

      <div className="about-section">
        <h4>Support the Project</h4>
        <p>
          If you enjoy the free version and just want to say thanks, you can support my work through GitHub Sponsors. This not only helps the development of Tideflow but helps me in all my future creative endeavours.
        </p>
        <div className="about-actions">
          <button
            onClick={handleExternalLink('https://github.com/sponsors/BDenizKoca')}
            className="btn-secondary"
          >
            Support via GitHub Sponsors
          </button>
        </div>
      </div>

      <div className="about-footer">
        <div className="about-links">
          <a
            href="#"
            onClick={handleExternalLink('https://github.com/BDenizKoca/Tideflow-md-to-pdf/releases')}
          >
            Check for new releases on GitHub
          </a>
          {' • '}
          <a
            href="#"
            onClick={handleExternalLink('https://github.com/BDenizKoca/Tideflow-md-to-pdf')}
          >
            View the source code on GitHub
          </a>
        </div>
        <div className="about-credits">
          Developed by Burak Deniz Koca (
          <a
            href="#"
            onClick={handleExternalLink('https://github.com/BDenizKoca')}
          >
            GitHub
          </a>
          {' • '}
          <a
            href="#"
            onClick={handleExternalLink('https://bdenizkoca.studio')}
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
