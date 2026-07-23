import { useState, useEffect } from 'react';
import { logsService } from '../services/api';

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3, Normal: 4 };

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('time');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = () => {
      // Request limit=50 since we paginate client-side
      logsService.getLogs(1, 50).then(res => {
        if (isMounted) {
          setLogs(res.logs);
          setLoading(false);
        }
      });
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const LIMIT = 6;
  const severities = ['All', 'Critical', 'High', 'Medium', 'Low', 'Normal'];

  const filtered = logs
    .filter(l => {
      const q = search?.toLowerCase() || '';
      return (
        (severityFilter === 'All' || l.severity === severityFilter) &&
        (l.ip?.includes(q) || (l.attack_type || 'Unknown')?.toLowerCase().includes(q) || l.timestamp?.includes(q))
      );
    })
    .sort((a, b) => {
      if (sortField === 'severity') {
        const valA = SEVERITY_ORDER[a.severity];
        const valB = SEVERITY_ORDER[b.severity];
        if (valA !== valB) {
          return sortDir === 'desc' ? valA - valB : valB - valA;
        }
        // Fallback to time if severities are equal
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortDir === 'desc' ? timeB - timeA : timeA - timeB;
      }
    });

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const counts = logs.reduce((acc, l) => {
    acc[l.severity] = (acc[l.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Event Logs</h1>
          <p className="page-subtitle">Network intrusion events — real-time log stream</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
          ↻ Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {['Critical', 'High', 'Medium', 'Low', 'Normal'].map(s => (
          <div
            key={s}
            className="card"
            style={{ padding: '12px 16px', cursor: 'pointer', borderColor: severityFilter === s ? 'var(--primary)' : '' }}
            onClick={() => { setSeverityFilter(severityFilter === s ? 'All' : s); setPage(1); }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: 4 }}>
              {counts[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="logs-table-wrap">
        <div className="logs-toolbar">
          <input
            className="search-input"
            placeholder="Search by IP, attack type, timestamp..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {severities.map(s => (
              <button
                key={s}
                className={`filter-chip${severityFilter === s ? ' active' : ''}`}
                onClick={() => { setSeverityFilter(s); setPage(1); }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-ghost btn-sm ${sortField === 'time' ? 'active' : ''}`}
              onClick={() => {
                if (sortField === 'time') setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                else { setSortField('time'); setSortDir('desc'); }
              }}
              title="Sort by time"
            >
              {sortField === 'time' ? (sortDir === 'desc' ? '↓ Recent' : '↑ Oldest') : 'Recent'}
            </button>
            <button
              className={`btn btn-ghost btn-sm ${sortField === 'severity' ? 'active' : ''}`}
              onClick={() => {
                if (sortField === 'severity') setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                else { setSortField('severity'); setSortDir('desc'); }
              }}
              title="Sort by severity"
            >
              {sortField === 'severity' ? (sortDir === 'desc' ? '↓ Severity' : '↑ Severity') : 'Severity'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="logs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Source IP</th>
                <th>Protocol</th>
                <th>Attack Type</th>
                <th>Severity</th>
                <th>Packets</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                    Loading events...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                    No events match your filter
                  </td>
                </tr>
              ) : (
                paginated.map((log, i) => (
                  <tr key={log.id}>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td className="mono">{log.timestamp}</td>
                    <td className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{log.ip}</td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        background: 'var(--bg-base)', border: '1px solid var(--border)',
                        padding: '2px 7px', borderRadius: 4, color: 'var(--text-primary)',
                      }}>
                        {log.protocol}
                      </span>
                    </td>
                    <td>
                      <span className="attack-type-badge">{log.attack_type}</span>
                    </td>
                    <td>
                      <span className={`severity-badge ${(log.severity || 'Normal').toLowerCase()}`}>
                        {log.severity === 'Critical' && '● '}
                        {log.severity || 'Normal'}
                      </span>
                    </td>
                    <td className="mono">{log.packets?.toLocaleString()}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px',
                        borderRadius: 99, fontFamily: 'var(--font-display)',
                        background: log.status === 'Blocked' ? 'var(--accent-red-light)' :
                                    log.status === 'Allowed' ? 'var(--accent-green-light)' : 'var(--accent-amber-light)',
                        color: log.status === 'Blocked' ? 'var(--accent-red)' :
                               log.status === 'Allowed' ? 'var(--accent-green)' : 'var(--accent-amber)',
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>{filtered.length} events</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
