import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Ticket, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { lookupTokens } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export function PatientLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';
  const [phone, setPhone] = useState(initialPhone);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { t } = useLanguage();

  const handleSearch = async (targetPhone) => {
    const p = targetPhone || phone;
    if (p.length !== 10) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await lookupTokens(p);
      setTokens(res);
      setSearchParams({ phone: p });
    } catch (err) {
      console.error(err);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPhone.length === 10) {
      handleSearch(initialPhone);
    }
  }, [initialPhone]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Find My Active Tokens
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your registered 10-digit mobile number to track all your OPD tokens
        </p>
      </div>

      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex items-center bg-white p-2 rounded-2xl shadow-md border border-slate-200"
      >
        <div className="pl-3 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="tel"
          pattern="[0-9]{10}"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter 10-digit phone number..."
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          disabled={phone.length !== 10 || loading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      {searched && (
        <div className="space-y-4 pt-2">
          {tokens.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Active Tokens Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active (waiting or in-progress) tokens were found for phone number {phone}.
              </p>
              <Link
                to="/patient"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Register New Token
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Active Tokens ({tokens.length})
              </h3>
              {tokens.map((token) => (
                <Link
                  key={token.id}
                  to={`/patient/track/${token.id}`}
                  className="block p-5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-black text-lg shadow-sm">
                        {token.token_number}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition">
                            {token.department_name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            token.status === 'in_progress'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {token.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Patient: {token.patient?.name} ({token.patient?.gender}, {token.patient?.age}y)
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Estimated Wait</span>
                        <span className="text-sm font-bold text-blue-700">
                          {token.status === 'waiting' ? `~${token.est_wait_min}m` : 'Ready'}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
