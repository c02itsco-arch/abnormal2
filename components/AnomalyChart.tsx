import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { Transaction, Anomaly } from '../types';

interface AnomalyChartProps {
  data: Transaction[];
  anomalies: Anomaly[];
}

export const AnomalyChart: React.FC<AnomalyChartProps> = ({ data, anomalies }) => {
  
  const chartData = useMemo(() => {
    const anomalyIds = new Set(anomalies.map(a => a.transactionId));
    
    return data.map((item, index) => ({
      ...item,
      // Create a numeric index for X-axis based on monthly string to separate clusters slightly or just use index
      // Using index for simpler scatter distribution view in this context
      index: index, 
      isAnomaly: anomalyIds.has(item.id),
      fill: anomalyIds.has(item.id) ? '#ef4444' : '#0ea5e9' // Red for anomaly, Blue for normal
    }));
  }, [data, anomalies]);

  // Separate data for Legend purposes
  const normalData = chartData.filter(d => !d.isAnomaly);
  const anomalyData = chartData.filter(d => d.isAnomaly);

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Amount Distribution Analysis</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            type="number" 
            dataKey="index" 
            name="Transaction Sequence" 
            tick={false} 
            label={{ value: 'Transactions (Sequence)', position: 'insideBottom', offset: -10 }} 
          />
          <YAxis 
            type="number" 
            dataKey="amount" 
            name="Amount" 
            unit="฿"
            label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} 
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as any;
                return (
                  <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
                    <p className="font-bold mb-1">{d.monthly}</p>
                    <p>BA: {d.BA}</p>
                    <p>Code: {d.actCode}</p>
                    <p className={`font-mono font-bold ${d.isAnomaly ? 'text-red-600' : 'text-blue-600'}`}>
                      {d.amount.toLocaleString()}
                    </p>
                    {d.isAnomaly && <p className="text-red-500 text-xs mt-1 font-semibold">Detected Anomaly</p>}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend verticalAlign="top" height={36}/>
          <Scatter name="Normal Transactions" data={normalData} fill="#0ea5e9" fillOpacity={0.6} shape="circle" />
          <Scatter name="Anomalies" data={anomalyData} fill="#ef4444" shape="triangle" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};