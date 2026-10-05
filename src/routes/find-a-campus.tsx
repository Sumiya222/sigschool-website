import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/find-a-campus")({ component: CampusFinderPage });

function CampusFinderPage() {
  return (
    <>
      <header className="about-page-hero compact-page-hero">
        <div className="tss-container">
          <p className="ref-kicker">Campus Network</p>
          <h1>Find a Campus</h1>
          <h2>Search Signature School campuses by province, city and area</h2>
        </div>
      </header>
      <section className="campus-finder">
        <div className="campus-finder-inner">
          <form className="campus-filters">
            {[
              ["Province", "[Verified provinces to be provided]"],
              ["City", "[Verified cities to be provided]"],
              ["Area", "[Verified areas to be provided]"],
            ].map(([label, pending]) => (
              <label key={label}>
                <span>{label}</span>
                <select aria-label={label} defaultValue="">
                  <option value="" disabled>
                    {label}
                  </option>
                  <option value="pending">{pending}</option>
                </select>
              </label>
            ))}
            <button type="button">Search Campus</button>
          </form>

          <article className="campus-result-card">
            <h2>[Campus information to be provided]</h2>
            <dl>
              <div>
                <dt>Address:</dt>
                <dd>[Official address to be provided]</dd>
              </div>
              <div>
                <dt>Phone:</dt>
                <dd>[Contact information to be provided]</dd>
              </div>
              <div>
                <dt>Email:</dt>
                <dd>[Contact information to be provided]</dd>
              </div>
              <div>
                <dt>Grades:</dt>
                <dd>[To be provided]</dd>
              </div>
              <div>
                <dt>Facilities:</dt>
                <dd>[To be provided]</dd>
              </div>
            </dl>
            <div className="campus-result-actions">
              <a href="/about/at-a-glance">View Campus</a>
              <a href="/contact">Get Directions</a>
              <a className="campus-apply" href="/apply-online">
                Apply Now
              </a>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
