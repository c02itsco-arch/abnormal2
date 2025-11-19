import React, { useState } from 'react';
import Papa from 'papaparse';
import { FileUpload } from './components/FileUpload';
import { AnomalyChart } from './components/AnomalyChart';
import { analyzeAnomalies } from './services/geminiService';
import { Transaction, Anomaly, AnalysisResult, LoadingState } from './types';
import { AlertCircle, CheckCircle2, Loader2, BarChart3 } from 'lucide-react';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    setLoadingState(LoadingState.PARSING);
    setAnalysis(null);
    setTransactions([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData: Transaction[] = results.data.map((row: any, index) => {
            // Sanitize amount: remove commas and convert to float
            // Handle quotes usually handled by papaparse, but ensure amount is clean
            const amountStr = row['amount'] ? row['amount'].toString().replace(/,/g, '') : '0';
            const amount = parseFloat(amountStr);

            if (isNaN(amount)) {
               // Skip or handle invalid rows gracefully
               return null;
            }

            return {
              id: index, // Use index as ID for simplicity
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Gemini Anomaly Detector
            </h1>
          </div>
          <div className="text-sm text-gray-500">Powered by Google Gemini 2.5</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Upload Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <div className="max-w-xl mx-auto">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              disabled={loadingState === LoadingState.PARSING || loadingState === LoadingState.ANALYZING} 
            />
          </div>
        </section>

        {/* Status Messages */}
        {loadingState === LoadingState.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
            <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
            <p className="text-lg font-medium text-gray-600">Gemini AI is analyzing your data...</p>
            <p className="text-sm text-gray-400">This might take a few seconds.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Analysis Failed</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {loadingState === LoadingState.COMPLETED && analysis && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle2 className="w-6 h-6" />
                <h2 className="text-xl font-bold">Analysis Complete</h2>
              </div>
              <p className="leading-relaxed opacity-90 text-lg">
                {analysis.summary}
              </p>
            </div>

            {/* Charts */}
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Visualization</h2>
              <AnomalyChart data={transactions} anomalies={analysis.anomalies} />
            </section>

            {/* Table */}
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Anomalies Detected</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ActCode</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">AI Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysis.anomalies.map((anomaly, idx) => {
                        const tx = transactions.find(t => t.id === anomaly.transactionId);
                        if (!tx) return null;
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-800' : 
                                  anomaly.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-green-100 text-green-800'}`}>
                                {anomaly.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {tx.actCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tx.monthly}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                              {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                              {anomaly.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;