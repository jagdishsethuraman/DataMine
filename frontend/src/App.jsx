import React, { useState, useEffect } from 'react';
import { Database, LayoutDashboard, Settings, PieChart, HardDrive, Play, Eye, AlertTriangle, Download, UploadCloud, ChevronRight, Activity, Trash } from 'lucide-react';
import { 
  LineChart, Line, 
  BarChart, Bar, 
  AreaChart, Area, 
  ScatterChart, Scatter,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b", "#06b6d4"];

function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [schema, setSchema] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('SELECT * FROM table LIMIT 100');
  const [xAxisCol, setXAxisCol] = useState('');
  const [yAxisCols, setYAxisCols] = useState([]);
  const [chartType, setChartType] = useState('line'); // line, bar, area, scatter, pie
  const [executionTime, setExecutionTime] = useState(null);
  const [queryError, setQueryError] = useState('');

  // Repository states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [converting, setConverting] = useState({});

  // Helper to format bytes
  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch datasets function
  const fetchDatasets = (selectDefault = false) => {
    fetch('http://localhost:8000/datasets')
      .then(res => res.json())
      .then(d => {
        if (d.datasets && d.datasets.length > 0) {
          setDatasets(d.datasets);
          if (selectDefault || !selectedDataset) {
            // If the current selection still exists in the new list, keep it; otherwise pick the first one
            const exists = d.datasets.some(ds => ds.name === selectedDataset);
            if (!exists) {
              setSelectedDataset(d.datasets[0].name);
            }
          }
        } else {
          setDatasets([]);
          setSelectedDataset('');
        }
      })
      .catch(console.error);
  };

  // Fetch datasets on mount
  useEffect(() => {
    fetchDatasets(true);
  }, []);

  // Fetch schema and run default query when dataset changes
  useEffect(() => {
    if (!selectedDataset) return;
    setLoading(true);
    setQueryError('');
    setExecutionTime(null);
    
    fetch(`http://localhost:8000/schema/${selectedDataset}`)
      .then(res => res.json())
      .then(d => {
        const currentSchema = d.schema || [];
        setSchema(currentSchema);
        
        // Pick smart defaults for X and Y axis from schema
        if (currentSchema.length > 0) {
          setXAxisCol(currentSchema[0].column_name);
          const numericCol = currentSchema.find(s => ['BIGINT', 'DOUBLE', 'INTEGER', 'FLOAT'].includes(s.column_type))?.column_name;
          setYAxisCols(numericCol ? [numericCol] : [currentSchema[1]?.column_name || currentSchema[0].column_name]);
        }

        // Set default query
        const defaultQuery = 'SELECT * FROM table LIMIT 100';
        setQuery(defaultQuery);

        // Run initial preview query
        return fetch(`http://localhost:8000/query/${selectedDataset}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: defaultQuery })
        });
      })
      .then(async res => {
        const d = await res.json();
        if (!res.ok) {
          throw new Error(d.detail || 'Failed to query dataset');
        }
        return d;
      })
      .then(d => {
        setData(d.data || []);
        setExecutionTime(d.execution_time_ms);
      })
      .catch(err => {
        setQueryError(err.message);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDataset]);

  // Execute current SQL query
  const handleRunQuery = (customQuery = query) => {
    if (!selectedDataset) return;
    setLoading(true);
    setQueryError('');
    
    fetch(`http://localhost:8000/query/${selectedDataset}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: customQuery })
    })
      .then(async res => {
        const d = await res.json();
        if (!res.ok) {
          throw new Error(d.detail || 'Failed to execute query');
        }
        return d;
      })
      .then(d => {
        setData(d.data || []);
        setExecutionTime(d.execution_time_ms);
        
        // Adjust selected chart columns if they are no longer in the output
        if (d.data && d.data.length > 0) {
          const keys = Object.keys(d.data[0]);
          if (keys.length > 0) {
            if (!keys.includes(xAxisCol)) {
              setXAxisCol(keys[0]);
            }
            // Filter out Y-axis selections that no longer exist in query output
            const validYCols = yAxisCols.filter(c => keys.includes(c));
            if (validYCols.length === 0) {
              setYAxisCols(keys[1] ? [keys[1]] : [keys[0]]);
            } else {
              setYAxisCols(validYCols);
            }
          }
        }
      })
      .catch(err => {
        setQueryError(err.message);
        setData([]);
      })
      .finally(() => setLoading(false));
  };

  // Convert CSV to Parquet format
  const handleConvertToParquet = (dsName) => {
    setConverting(prev => ({ ...prev, [dsName]: true }));
    fetch(`http://localhost:8000/convert/${dsName}`, {
      method: 'POST'
    })
      .then(async res => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || 'Conversion failed');
        return d;
      })
      .then(d => {
        if (selectedDataset === dsName) {
          setSelectedDataset(d.new_name);
        }
        fetchDatasets();
      })
      .catch(err => {
        alert(`Conversion error: ${err.message}`);
      })
      .finally(() => {
        setConverting(prev => ({ ...prev, [dsName]: false }));
      });
  };

  // Handle file uploads
  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', uploadFile);

    fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    })
      .then(async res => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || 'Upload failed');
        return d;
      })
      .then(() => {
        setUploadMessage(`Successfully uploaded ${uploadFile.name}`);
        setUploadFile(null);
        document.getElementById('file-input').value = '';
        fetchDatasets();
      })
      .catch(err => {
        setUploadMessage(`Error: ${err.message}`);
      })
      .finally(() => setUploading(false));
  };

  // Export query results to local CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val !== null ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = selectedDataset.replace(/\.[^/.]+$/, "");
    link.setAttribute("download", `${fileName}_query_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SQL Presets Template applicator
  const applyTemplate = (tmpl) => {
    let sql = '';
    const numericCol = schema.find(s => ['BIGINT', 'DOUBLE', 'INTEGER', 'FLOAT'].includes(s.column_type))?.column_name || 'price';
    const textCol = schema.find(s => ['VARCHAR', 'TEXT'].includes(s.column_type))?.column_name || 'category';
    const dateCol = schema.find(s => ['TIMESTAMP', 'DATE'].includes(s.column_type))?.column_name || 'transaction_date';

    switch (tmpl) {
      case 'preview':
        sql = 'SELECT * FROM table LIMIT 100';
        break;
      case 'group_by':
        sql = `SELECT ${textCol}, COUNT(*) as count \nFROM table \nGROUP BY ${textCol} \nORDER BY count DESC \nLIMIT 10`;
        break;
      case 'agg':
        sql = `SELECT ${textCol}, SUM(${numericCol}) as total_value \nFROM table \nGROUP BY ${textCol} \nORDER BY total_value DESC`;
        break;
      case 'timeseries':
        sql = `SELECT ${dateCol}, SUM(${numericCol}) as daily_value \nFROM table \nGROUP BY ${dateCol} \nORDER BY ${dateCol} ASC`;
        break;
      default:
        sql = 'SELECT * FROM table LIMIT 100';
    }
    setQuery(sql);
    handleRunQuery(sql);
  };

  // Render Recharts components dynamically
  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div className="chart-empty-state">
          <PieChart size={36} color="var(--text-secondary)" style={{marginBottom: '0.75rem'}} />
          <div>No data available. Run a valid SQL query first!</div>
        </div>
      );
    }

    if (chartType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey={xAxisCol} stroke="#94a3b8" tickLine={false} name={xAxisCol} />
            <YAxis stroke="#94a3b8" tickLine={false} name={yAxisCols[0] || 'Value'} />
            <ChartTooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(20, 26, 40, 0.95)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
              }}
              labelStyle={{ color: 'var(--text-secondary)' }}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Legend />
            <Scatter name={yAxisCols[0] || 'Data Series'} data={data} fill="var(--accent-primary)" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      const targetYCol = yAxisCols[0] || 'count';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <ChartTooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(20, 26, 40, 0.95)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px'
              }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            <Pie
              data={data}
              dataKey={targetYCol}
              nameKey={xAxisCol}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="var(--accent-primary)"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
      );
    }

    const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart;
    const DataComponent = chartType === 'bar' ? Bar : chartType === 'area' ? Area : Line;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey={xAxisCol} stroke="#94a3b8" tickLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} />
          <ChartTooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(20, 26, 40, 0.95)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
            }}
            labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend />
          {chartType === 'area' && (
            <defs>
              {yAxisCols.map((col, idx) => (
                <linearGradient key={col} id={`glow-${col}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
          )}
          {yAxisCols.map((col, idx) => (
            <DataComponent 
              key={col}
              type="monotone" 
              dataKey={col} 
              stroke={COLORS[idx % COLORS.length]} 
              fill={chartType === 'area' ? `url(#glow-${col})` : COLORS[idx % COLORS.length]}
              fillOpacity={chartType === 'area' ? 1 : 0.8}
              strokeWidth={2}
              dot={data.length < 80}
              name={col}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const toggleYAxisCol = (col) => {
    if (yAxisCols.includes(col)) {
      if (yAxisCols.length > 1) {
        setYAxisCols(yAxisCols.filter(c => c !== col));
      }
    } else {
      setYAxisCols([...yAxisCols, col]);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="glass-panel sidebar">
        <div className="brand">
          <Database size={24} color="var(--accent-primary)" />
          DataMine
        </div>
        <ul className="nav-links">
          <li 
            className={`nav-item ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            <LayoutDashboard size={18} /> Workspace
          </li>
          <li 
            className={`nav-item ${activeTab === 'repository' ? 'active' : ''}`}
            onClick={() => setActiveTab('repository')}
          >
            <HardDrive size={18} /> Repository
          </li>
        </ul>

        {/* Info panel in Sidebar */}
        <div className="sidebar-info-card">
          <h4><Activity size={14} color="var(--accent-success)" /> Performance Mode</h4>
          <p>
            CSVs are scanned natively. To make reads 10x faster, switch to the Repository tab and convert large CSVs to optimized Parquet formats.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Topbar */}
        <div className="glass-panel topbar">
          <div className="topbar-left">
            <h3>Data Repository Workspace</h3>
            <span className="subtitle">
              {activeTab === 'workspace' 
                ? `Active File: ${selectedDataset || 'None'}` 
                : 'Manage and optimize CSV/Parquet uploads'}
            </span>
          </div>
          <div className="topbar-right">
            {activeTab === 'workspace' && (
              <select 
                className="select-dataset" 
                value={selectedDataset} 
                onChange={e => setSelectedDataset(e.target.value)}
              >
                {datasets.map(ds => (
                  <option key={ds.name} value={ds.name}>{ds.name} ({ds.format})</option>
                ))}
                {datasets.length === 0 && <option>No datasets found</option>}
              </select>
            )}
          </div>
        </div>

        {/* Tab Selection Content */}
        {activeTab === 'workspace' ? (
          <div className="workspace-layout">
            {/* Workspace Area: Editor, Visualizer, Table */}
            <div className="workspace-main">
              {/* SQL Editor Card */}
              <div className="glass-panel workspace-card">
                <div className="card-header-with-actions">
                  <div className="header-title">
                    <Database size={18} color="var(--accent-primary)" />
                    SQL Query Editor
                  </div>
                  {executionTime !== null && (
                    <div className="query-metrics">
                      <span className="metric-tag">Rows: {data.length}</span>
                      <span className="metric-tag">Time: {executionTime} ms</span>
                    </div>
                  )}
                </div>

                {/* Editor Controls / Templates */}
                <div className="editor-templates">
                  <span className="templates-label">Templates:</span>
                  <button className="template-btn" onClick={() => applyTemplate('preview')}>Preview</button>
                  <button className="template-btn" onClick={() => applyTemplate('group_by')}>Group By Count</button>
                  <button className="template-btn" onClick={() => applyTemplate('agg')}>Value Sum</button>
                  <button className="template-btn" onClick={() => applyTemplate('timeseries')}>Time Series</button>
                </div>

                <div className="sql-editor-container">
                  <textarea 
                    className="sql-textarea"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="SELECT * FROM table LIMIT 100"
                  />
                </div>

                <div className="editor-footer">
                  <button 
                    className="run-query-btn" 
                    onClick={() => handleRunQuery()} 
                    disabled={loading}
                  >
                    <Play size={16} fill="currentColor" />
                    {loading ? 'Running...' : 'Execute Query'}
                  </button>
                </div>

                {/* SQL Error Banner */}
                {queryError && (
                  <div className="error-banner">
                    <AlertTriangle size={18} />
                    <div className="error-message">
                      <strong>DuckDB Query Error:</strong>
                      <pre>{queryError}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Visualizer Card */}
              <div className="glass-panel workspace-card">
                <div className="card-header-with-actions">
                  <div className="header-title">
                    <PieChart size={18} color="var(--accent-secondary)" />
                    Interactive Visualization
                  </div>
                  {data.length > 0 && (
                    <div className="chart-controls">
                      <div className="control-group">
                        <label>X-Axis:</label>
                        <select value={xAxisCol} onChange={e => setXAxisCol(e.target.value)}>
                          {Object.keys(data[0] || {}).map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>

                      <div className="control-group">
                        <label>Type:</label>
                        <select value={chartType} onChange={e => setChartType(e.target.value)}>
                          <option value="line">Line</option>
                          <option value="bar">Bar</option>
                          <option value="area">Area</option>
                          <option value="scatter">Scatter</option>
                          <option value="pie">Pie</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-series selection row */}
                {data.length > 0 && chartType !== 'pie' && chartType !== 'scatter' && (
                  <div className="multi-series-selector">
                    <span className="selector-label">Y-Axis Series (Toggle multi):</span>
                    <div className="series-pills">
                      {Object.keys(data[0] || {}).map(k => {
                        const isSelected = yAxisCols.includes(k);
                        return (
                          <button 
                            key={k} 
                            className={`series-pill ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleYAxisCol(k)}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Single target indicator for Pie/Scatter */}
                {data.length > 0 && (chartType === 'pie' || chartType === 'scatter') && (
                  <div className="multi-series-selector">
                    <span className="selector-label">Y-Axis Variable:</span>
                    <div className="series-pills">
                      {Object.keys(data[0] || {}).map(k => {
                        const isSelected = yAxisCols[0] === k;
                        return (
                          <button 
                            key={k} 
                            className={`series-pill ${isSelected ? 'selected' : ''}`}
                            onClick={() => setYAxisCols([k])}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="chart-viewport">
                  {loading ? (
                    <div className="loader-container">
                      <div className="spinner"></div>
                      <div>Querying dataset...</div>
                    </div>
                  ) : (
                    renderChart()
                  )}
                </div>
              </div>

              {/* Raw Data Preview Card */}
              <div className="glass-panel workspace-card">
                <div className="card-header-with-actions">
                  <div className="header-title">
                    <Eye size={18} />
                    Query Results Preview
                  </div>
                  {data.length > 0 && (
                    <button className="export-csv-btn" onClick={handleExportCSV}>
                      <Download size={14} />
                      Export CSV
                    </button>
                  )}
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {data.length > 0 ? (
                          Object.keys(data[0]).map(key => (
                            <th key={key}>{key}</th>
                          ))
                        ) : (
                          schema.map(col => (
                            <th key={col.column_name}>{col.column_name}</th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i}>
                          {Object.keys(row).map(key => (
                            <td key={key}>{row[key] !== null ? String(row[key]) : <span className="null-val">null</span>}</td>
                          ))}
                        </tr>
                      ))}
                      {data.length === 0 && !loading && (
                        <tr>
                          <td colSpan={schema.length || 1} className="no-data-cell">
                            No rows returned.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Schema Reference catalog */}
            <div className="workspace-sidebar">
              <div className="glass-panel schema-card">
                <div className="schema-header">
                  <Database size={16} color="var(--accent-primary)" />
                  Schema Dictionary
                </div>
                <div className="schema-list">
                  {schema.map(col => (
                    <div key={col.column_name} className="schema-item" title="Click to copy column name" onClick={() => {
                      navigator.clipboard.writeText(col.column_name);
                    }}>
                    <div className="schema-col-name">{col.column_name}</div>
                    <div className="schema-col-type">{col.column_type}</div>
                  </div>
                ))}
                {schema.length === 0 && (
                  <div className="schema-empty">Loading schema dictionary...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Repository Tab Content */
        <div className="repository-layout">
          {/* File Upload card */}
          <div className="glass-panel workspace-card">
            <div className="header-title">
              <UploadCloud size={20} color="var(--accent-primary)" style={{marginRight: '0.5rem'}} />
              Upload New CSV / Parquet File
            </div>
            <form onSubmit={handleUpload} className="upload-form">
              <div className="dropzone-container">
                <input 
                  type="file" 
                  id="file-input"
                  accept=".csv,.parquet"
                  onChange={e => setUploadFile(e.target.files[0])}
                  className="file-input-raw"
                />
                <label htmlFor="file-input" className="file-input-label">
                  <UploadCloud size={32} color="var(--text-secondary)" style={{marginBottom: '0.5rem'}} />
                  <span>{uploadFile ? uploadFile.name : 'Click to select CSV or Parquet file'}</span>
                </label>
              </div>
              <button 
                type="submit" 
                className="run-query-btn"
                disabled={!uploadFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
            {uploadMessage && (
              <div className="upload-message-bar">
                {uploadMessage}
              </div>
            )}
          </div>

          {/* Dataset Manager Table Card */}
          <div className="glass-panel workspace-card" style={{marginTop: '1rem'}}>
            <div className="header-title" style={{marginBottom: '1rem'}}>
              <HardDrive size={18} color="var(--accent-secondary)" style={{marginRight: '0.5rem'}} />
              Local File Repository Catalog
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Format Type</th>
                    <th>File Size</th>
                    <th>Status / Optimization</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map(ds => (
                    <tr key={ds.name}>
                      <td style={{fontWeight: 600}}>{ds.name}</td>
                      <td>
                        <span className={`format-badge ${ds.format.toLowerCase()}`}>
                          {ds.format}
                        </span>
                      </td>
                      <td>{formatBytes(ds.size_bytes)}</td>
                      <td>
                        {ds.format === 'CSV' ? (
                          <button 
                            className="optimize-btn"
                            onClick={() => handleConvertToParquet(ds.name)}
                            disabled={converting[ds.name]}
                          >
                            {converting[ds.name] ? 'Optimizing...' : 'Convert to Parquet'}
                          </button>
                        ) : (
                          <span className="optimized-label">
                            <Activity size={12} color="var(--accent-success)" style={{marginRight: '0.25rem'}} />
                            Optimized (Fast Engine)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {datasets.length === 0 && (
                    <tr>
                      <td colSpan="4" className="no-data-cell">
                        No datasets found in workspace. Drop one in doc data/ directory or upload one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default App;
