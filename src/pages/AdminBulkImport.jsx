import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import { Upload, FileText, Users, CheckCircle, XCircle, Download, AlertTriangle } from 'lucide-react';

const VALID_ROLES = ['student', 'teacher', 'instructor'];
const REQUIRED_COLUMNS = ['email', 'full_name', 'phone', 'role', 'education_level'];
const DEFAULT_TEMP_PASSWORD = 'Welcome@123';

const AdminBulkImport = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [parsedRows, setParsedRows] = useState([]);
  const [existingEmails, setExistingEmails] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setAlertModal({ show: true, title: 'Empty CSV', message: 'CSV must have a header row and at least one data row.', type: 'warning' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const missingCols = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
    if (missingCols.length > 0) {
      setAlertModal({ show: true, title: 'Missing Columns', message: `CSV is missing required columns: ${missingCols.join(', ')}`, type: 'warning' });
      return;
    }

    const rows = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return { ...row, _line: idx + 2 };
    });

    const validated = rows.map((row) => {
      const errors = [];
      if (!row.email || !validateEmail(row.email)) errors.push('Invalid email');
      if (!row.full_name) errors.push('Full name required');
      if (!row.phone) errors.push('Phone required');
      if (!VALID_ROLES.includes(row.role?.toLowerCase())) errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
      if (!row.education_level) errors.push('Education level required');
      const isDuplicate = existingEmails.has(row.email?.toLowerCase());
      if (isDuplicate) errors.push('Email already exists');
      return { ...row, _errors: errors, _valid: errors.length === 0, _duplicate: isDuplicate };
    });

    setParsedRows(validated);
    setResults(null);
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setAlertModal({ show: true, title: 'Invalid File', message: 'Please upload a .csv file.', type: 'warning' });
      return;
    }

    const { data: existing } = await supabase.from('profiles').select('email');
    setExistingEmails(new Set((existing || []).map((e) => e.email?.toLowerCase())));

    const text = await file.text();
    parseCSV(text);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      setAlertModal({ show: true, title: 'No Valid Rows', message: 'There are no valid rows to import.', type: 'warning' });
      return;
    }

    setImporting(true);
    setProgress({ current: 0, total: validRows.length });
    let succeeded = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const { error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: row.email,
            password: DEFAULT_TEMP_PASSWORD,
            full_name: row.full_name,
            phone: row.phone,
            role: row.role?.toLowerCase(),
            education_level: row.education_level,
          },
        });
        if (error) throw new Error(error.message);
        succeeded++;
      } catch (err) {
        failed++;
        failures.push({ email: row.email, error: err.message || 'Unknown error' });
      }
      setProgress({ current: i + 1, total: validRows.length });
    }

    const importRecord = {
      timestamp: new Date().toISOString(),
      total: validRows.length,
      succeeded,
      failed,
    };
    setImportHistory((prev) => [importRecord, ...prev].slice(0, 10));
    setResults({ succeeded, failed, failures });
    setImporting(false);

    await supabase.from('import_history').insert({
      admin_id: user?.id,
      total_rows: validRows.length,
      succeeded,
      failed,
      details: JSON.stringify(failures),
    });
  };

  const downloadTemplate = () => {
    const csv = 'email,full_name,phone,role,education_level\nstudent@example.com,John Doe,+919876543210,student,B.Tech CSE\nteacher@example.com,Jane Smith,+919876543211,teacher,M.Tech\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sucesskart_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter((r) => r._valid).length;
  const invalidCount = parsedRows.filter((r) => !r._valid && !r._duplicate).length;
  const duplicateCount = parsedRows.filter((r) => r._duplicate).length;

  return (
    <div className="space-y-6">
      <AlertModal
        show={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
      />

      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-xl text-white">
        <div className="flex items-center gap-3 mb-1">
          <Users size={28} />
          <h1 className="text-2xl font-bold">Bulk User Import</h1>
        </div>
        <p className="text-emerald-100">Upload a CSV to create multiple student or teacher accounts at once.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium">
          <Download size={16} /> Download CSV Template
        </button>
        <button onClick={() => setShowHistory(!showHistory)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium">
          <FileText size={16} /> Import History
        </button>
      </div>

      {showHistory && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-sm mb-3">Recent Imports</h3>
          {importHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No imports in this session.</p>
          ) : (
            <div className="space-y-2">
              {importHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-4 text-sm border-b last:border-0 pb-2">
                  <span className="text-slate-500">{new Date(h.timestamp).toLocaleString('en-IN')}</span>
                  <span className="text-green-600 font-semibold">{h.succeeded} succeeded</span>
                  {h.failed > 0 && <span className="text-red-600 font-semibold">{h.failed} failed</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
      >
        <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <p className="text-slate-700 font-semibold">Drop a CSV file here or click to browse</p>
        <p className="text-sm text-slate-500 mt-1">Accepts .csv files with columns: email, full_name, phone, role, education_level</p>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {parsedRows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Total Rows</p>
              <p className="text-xl font-bold text-slate-900">{parsedRows.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600">Valid</p>
              <p className="text-xl font-bold text-green-700">{validCount}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-xs text-red-600">Invalid</p>
              <p className="text-xl font-bold text-red-700">{invalidCount}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
              <p className="text-xs text-yellow-600">Duplicates</p>
              <p className="text-xl font-bold text-yellow-700">{duplicateCount}</p>
            </div>
          </div>

          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Full Name</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Education</th>
                  <th className="px-3 py-2 text-left">Issues</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i} className={`border-t ${row._valid ? 'bg-green-50/40' : row._duplicate ? 'bg-yellow-50/40' : 'bg-red-50/40'}`}>
                    <td className="px-3 py-2">
                      {row._valid ? <CheckCircle size={16} className="text-green-600" /> : <XCircle size={16} className="text-red-600" />}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.email}</td>
                    <td className="px-3 py-2 text-slate-700">{row.full_name}</td>
                    <td className="px-3 py-2 text-slate-700">{row.phone}</td>
                    <td className="px-3 py-2 text-slate-700">{row.role}</td>
                    <td className="px-3 py-2 text-slate-700">{row.education_level}</td>
                    <td className="px-3 py-2 text-xs text-red-600">{row._errors.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all"
            >
              <Upload size={18} />
              {importing ? `Importing ${progress.current}/${progress.total}...` : `Import ${validCount} Users`}
            </button>
            <button
              onClick={() => { setParsedRows([]); setResults(null); }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
            >
              Clear
            </button>
          </div>

          {importing && (
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          )}
        </>
      )}

      {results && (
        <div className={`border rounded-xl p-5 ${results.failed > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
          <div className="flex items-center gap-2 mb-2">
            {results.failed > 0 ? <AlertTriangle className="text-yellow-600" size={20} /> : <CheckCircle className="text-green-600" size={20} />}
            <h3 className="font-bold text-lg">Import Complete</h3>
          </div>
          <p className="text-sm text-slate-700">
            <span className="text-green-600 font-semibold">{results.succeeded} succeeded</span>
            {results.failed > 0 && <>, <span className="text-red-600 font-semibold">{results.failed} failed</span></>}
          </p>
          {results.failures?.length > 0 && (
            <div className="mt-3 space-y-1">
              {results.failures.map((f, i) => (
                <p key={i} className="text-xs text-red-600">{f.email}: {f.error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBulkImport;
