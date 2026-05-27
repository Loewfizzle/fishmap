import { useState } from 'react'

// PR 1 sample data (sourced directly from data/processed/access_points_sample.geojson
// produced by `make etl-sample`). Inline for reliable dev server in bootstrap.
// Issue 9 note: This is a curated mirror for the stub (PR2 will load the real JSON).
// Citations kept in sync with ETL output + manifest.
const SAMPLE_SITES = [
  {
    id: "gr-fishladder-001",
    name: "Fish Ladder Park - Grand River Shore",
    waterbody: "Grand River (mainstem)",
    access_type: "bank",
    access_quality: "high",
    lat: 42.9682,
    lon: -85.6721,
    last_verified: "2026-03-15",
    sources: [
      { name: "Michigan DNR Michigan Boating Facilities (MiBFF) + Shore Fishing resources", url: "https://gis-midnr.opendata.arcgis.com/maps/3eaf9804bf6f4bafb8e03aea660c9fce", retrieved: "2026-05-20" },
      { name: "City of Grand Rapids Parks (GRData Open Data)", url: "https://grdata-grandrapids.opendata.arcgis.com/", retrieved: "2026-05-20" },
      { name: "Kent County Parks & GIS Open Data", url: "https://kentcountymi-accesskent.opendata.arcgis.com/", retrieved: "2026-05-20" }
    ],
    notes: "Excellent shore and wade fishing below dam. Strong current warning."
  },
  {
    id: "kent-johnson-002",
    name: "Johnson Park Shoreline (Millennium Park)",
    waterbody: "Grand River (mainstem)",
    access_type: "bank",
    access_quality: "high",
    lat: 42.9419,
    lon: -85.7367,
    last_verified: "2026-03-15",
    sources: [
      { name: "Kent County Parks & GIS Open Data", url: "https://kentcountymi-accesskent.opendata.arcgis.com/", retrieved: "2026-05-20" },
      { name: "City of Grand Rapids Parks (GRData Open Data)", url: "https://grdata-grandrapids.opendata.arcgis.com/", retrieved: "2026-05-20" }
    ],
    notes: "1.5+ miles of Grand River shoreline via Johnson Park Scenic Trail."
  },
  {
    id: "gr-richmond-003",
    name: "Richmond Park Fishing Pier",
    waterbody: "Richmond Park Pond",
    access_type: "pier",
    access_quality: "high",
    lat: 42.9937,
    lon: -85.6942,
    last_verified: "2026-03-15",
    sources: [
      { name: "City of Grand Rapids Parks (GRData Open Data)", url: "https://grdata-grandrapids.opendata.arcgis.com/", retrieved: "2026-05-20" }
    ],
    notes: "Dedicated fishing pier on city pond."
  },
  {
    id: "kent-reeds-004",
    name: "Reeds Lake Shore Access",
    waterbody: "Reeds Lake",
    access_type: "bank",
    access_quality: "high",
    lat: 42.9546,
    lon: -85.6122,
    last_verified: "2026-03-15",
    sources: [
      { name: "Kent County Parks & GIS Open Data", url: "https://kentcountymi-accesskent.opendata.arcgis.com/", retrieved: "2026-05-20" }
    ],
    notes: "Popular family shore fishing with easy public access."
  }
]

function App() {
  const [_showOnlyShoreDock] = useState(true)  // Issue 17: _ prefix signals stub (unused setter; toggle lands in PR2)

  const filtered = _showOnlyShoreDock
    ? SAMPLE_SITES.filter(s => ['bank', 'dock', 'pier', 'wade', 'road_end', 'park_shore'].includes(s.access_type))
    : SAMPLE_SITES

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fishmap</h1>
            <p className="text-sm text-slate-600">Shore &amp; Dock Fishing • 40-mile Grand Rapids radius</p>
          </div>
          <div className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-mono">
            PR 1 SAMPLE DATA
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded text-sm">
          <strong>PR 1 Foundation.</strong> This is the bootstrap + first real attributed data artifact.
          Full interactive MapLibre (with the filter expressions from DESIGN.md), search, near-me, and rich panels land in PR 2+.
          Data produced by <code>make etl-sample</code> (see manifest + DATA-VERIFICATION.md).
        </div>

        {/* Map stub per DESIGN (MapLibre + shore filter) */}
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-2">Map (stub)</h2>
          <div className="map-stub rounded-lg">
            <div>
              <div className="font-semibold mb-1">MapLibre GL JS + PMTiles (future)</div>
              <div className="text-xs max-w-md">
                Centered on Grand Rapids AOI. Layers: access_points (symbol, color by access_type),
                water. Filter example from DESIGN:<br />
                <code>['in', ['get', 'access_type'], ['literal', ['bank','dock','pier','wade','road_end','park_shore']]]</code>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">npm run dev will evolve into the full PR 2 prototype.</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">4 high-quality public shore/pier sites from PR 1 ETL (all citations present).</p>
        </section>

        {/* Access list (real data from etl-sample) */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-medium">Sample Shore &amp; Dock Access Points ({filtered.length})</h2>
            <span className="text-xs text-emerald-700">Shore &amp; Dock Only (toggle in PR 2)</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(site => (
              <div key={site.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{site.name}</div>
                    <div className="text-sm text-slate-600">{site.waterbody}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">{site.access_type}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">{site.access_quality}</div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  {site.lat.toFixed(4)}, {site.lon.toFixed(4)} • last verified {site.last_verified}
                </div>

                <div className="mt-3 text-sm">{site.notes}</div>

                <div className="mt-3 pt-3 border-t text-[11px]">
                  <div className="font-medium text-slate-700 mb-1">Sources (citations)</div>
                  <ul className="space-y-0.5">
                    {site.sources.map((s, i) => (
                      <li key={i}>
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {s.name}
                        </a>
                        <span className="text-slate-400"> • retrieved {s.retrieved}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 text-xs text-slate-500 border-t pt-4">
          All data carries machine-readable provenance. See <a href="https://github.com/" className="underline">DESIGN.md</a>, <code>data/processed/manifest.json</code>, and <code>DATA-VERIFICATION.md</code>.
          This is not legal advice — verify on-site and with current DNR regulations.
        </footer>
      </main>
    </div>
  )
}

export default App
