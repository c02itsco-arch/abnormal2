import React, { useState } from 'react';
import Papa from 'papaparse';
import { FileUpload } from './components/FileUpload';
import { AnomalyChart } from './components/AnomalyChart';
import { analyzeAnomalies } from './services/geminiService';
import { Transaction, Anomaly, AnalysisResult, LoadingState } from './types';
import { AlertCircle, CheckCircle2, Loader2, BarChart3, FileSpreadsheet } from 'lucide-react';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = (file: File) => {
    setError(null);
    setLoadingState(LoadingState.PARSING);
    setAnalysis(null);
    setTransactions([]);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData: Transaction[] = results.data.map((row: any, index) => {
            // Sanitize amount: remove commas and convert to float
            const amountStr = row['amount'] ? row['amount'].toString().replace(/,/g, '') : '0';
            const amount = parseFloat(amountStr);

            if (isNaN(amount)) {
               return null;
            }

            return {
              id: index,
              BA: row['BA'],
              monthly: row['monthly'],
              actCode: row['actCode'],
              amount: amount,
              originalAmountStr: row['amount']
            };
          }).filter((t): t is Transaction => t !== null);

          if (parsedData.length === 0) {
            throw new Error("No valid data found in CSV.");
          }

          // Sort by monthly to make the chart more logical
          parsedData.sort((a, b) => a.monthly.localeCompare(b.monthly));

          setTransactions(parsedData);
          startAnalysis(parsedData);

        } catch (err: any) {
          setError(err.message || "Failed to parse CSV.");
          setLoadingState(LoadingState.ERROR);
        }
      },
      error: (err) => {
        setError(err.message);
        setLoadingState(LoadingState.ERROR);
      }
    });
  };

  const startAnalysis = async (data: Transaction[]) => {
    setLoadingState(LoadingState.ANALYZING);
    try {
      const result = await analyzeAnomalies(data);
      setAnalysis(result);
      setLoadingState(LoadingState.COMPLETED);
    } catch (err: any) {
      setError(err.message);
      setLoadingState(LoadingState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-md">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
              Gemini Anomaly Detector
            </h1>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            <span>Powered by Google Gemini 2.5 Flash</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Main Content Area */}
        <div className="grid gap-8">
          
          {/* Upload & Status Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1">
            {loadingState === LoadingState.IDLE || loadingState === LoadingState.ERROR ? (
              <div className="p-6">
                 <FileUpload 
                  onFileSelect={handleFileSelect} 
                  disabled={false} 
                />
              </div>
            ) : (
               <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
                  {loadingState === LoadingState.COMPLETED ? (
                    <>
                      <div className="bg-green-100 p-4 rounded-full mb-2">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">Analysis Completed</h3>
                      <p className="text-slate-500">Analyzed {transactions.length.toLocaleString()} transactions from <span className="font-medium text-slate-700">{fileName}</span></p>
                      <button 
                        onClick={() => {
                          setLoadingState(LoadingState.IDLE);
                          setAnalysis(null);
                          setTransactions([]);
                        }}
                        className="mt-4 text-sm text-blue-600 hover:text-blue-800 hover:underline underline-offset-2"
                      >
                        Analyze another file
                      </button>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">Analyzing Data</h3>
                        <p className="text-sm text-slate-500 mt-1">Sending transaction patterns to Gemini...</p>
                      </div>
                    </>
                  )}
               </div>
            )}
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Processing Error</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {loadingState === LoadingState.COMPLETED && analysis && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              
              {/* AI Summary */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="flex items-start space-x-4 relative z-10">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold opacity-90 mb-2 uppercase tracking-wider text-blue-100">AI Executive Summary</h2>
                    <p className="text-lg leading-relaxed font-light">
                      {analysis.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                 <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Scatter Distribution</h2>
                    <p className="text-sm text-slate-500">Visualizing transaction amounts over time. Red markers indicate detected anomalies.</p>
                 </div>
                 <AnomalyChart data={transactions} anomalies={analysis.anomalies} />
              </div>

              {/* Anomalies Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800">Top Detected Anomalies</h2>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {analysis.anomalies.length} Issues Found
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.anomalies.map((anomaly, idx) => {
                        const tx = transactions.find(t => t.id === anomaly.transactionId);
                        if (!tx) return null;
                        return (
                          <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm border
                                ${anomaly.severity === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' : 
                                  anomaly.severity === 'MEDIUM' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                                  'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                {anomaly.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{tx.actCode}</div>
                              <div className="text-xs text-slate-400">{tx.BA}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {tx.monthly}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-slate-800">
                              {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 group-hover:text-slate-900">
                              {anomaly.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;