"use client";

import React, { useState, useMemo } from "react";
import { useGetSuperAdminAnalyticsQuery, useGetSuperAdminOrganizationsQuery } from "@/services/api/superAdminApi";
import { Loader2, TrendingUp, Users, Building2, CreditCard, IndianRupee, Download, Sparkles, ArrowRight } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import Link from "next/link";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xl">
        <p className="font-bold text-slate-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1 text-sm font-medium">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-300 capitalize">{entry.name}:</span>
            <span className="text-slate-900 dark:text-white">
              {entry.name === "revenue" ? "₹" : ""}{Number(entry.value).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useGetSuperAdminAnalyticsQuery();
  const { data: orgData, isLoading: isLoadingOrgs } = useGetSuperAdminOrganizationsQuery();
  const [activeMetric, setActiveMetric] = useState("revenue");

  const chartData = useMemo(() => {
    if (!analyticsData?.items) return [];
    return [...analyticsData.items].reverse();
  }, [analyticsData]);

  const summary = analyticsData?.summary || [];
  const getSummaryValue = (key) => {
    const item = summary.find(s => s.label.toLowerCase() === key.toLowerCase());
    return item ? item.value : 0;
  };

  const metrics = [
    { id: "revenue", label: "Revenue", value: getSummaryValue("revenue"), icon: IndianRupee, color: "#10b981", prefix: "₹" },
    { id: "organizations", label: "Organizations", value: getSummaryValue("organizations"), icon: Building2, color: "#3b82f6" },
    { id: "users", label: "Users", value: getSummaryValue("users"), icon: Users, color: "#8b5cf6" },
    { id: "payments", label: "Payments", value: getSummaryValue("payments"), icon: CreditCard, color: "#f59e0b" },
  ];

  // AI Insights calculation
  const insights = useMemo(() => {
    if (chartData.length < 2) return null;
    const current = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    let growth = 0;
    if (previous.revenue > 0) {
      growth = ((current.revenue - previous.revenue) / previous.revenue) * 100;
    }
    
    return {
      growth: growth.toFixed(1),
      isPositive: growth >= 0,
      newOrgs: current.organizations,
      month: current.month
    };
  }, [chartData]);

  const topOrganizations = useMemo(() => {
    if (!orgData?.items) return [];
    return [...orgData.items]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [orgData]);

  const handleExportCSV = () => {
    if (!chartData.length) return;
    const headers = ["Month", "Revenue", "Organizations", "Users", "Payments"];
    const csvContent = [
      headers.join(","),
      ...chartData.map(row => `${row.month},${row.revenue},${row.organizations},${row.users},${row.payments}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingAnalytics) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Platform Analytics
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Monitor your platform's growth and trends in real-time.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="brand-btn brand-btn-primary brand-btn-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* AI Insights Banner */}
      {insights && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10 backdrop-blur-sm flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 mt-0.5">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">AI Dashboard Insight</h3>
            <p className="text-sm text-indigo-800 dark:text-indigo-200/80 mt-1">
              In {insights.month}, revenue {insights.isPositive ? "grew by" : "dropped by"} <strong className="font-black">{Math.abs(insights.growth)}%</strong> compared to the previous month. The platform also acquired <strong className="font-black">{insights.newOrgs}</strong> new organizations.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards with Sparklines */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            onClick={() => setActiveMetric(metric.id)}
            className={`cursor-pointer overflow-hidden relative rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              activeMetric === metric.id
                ? "border-indigo-500 bg-white shadow-lg dark:border-indigo-500/50 dark:bg-slate-900"
                : "border-slate-200 bg-white/60 backdrop-blur-md hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700"
            }`}
          >
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {metric.label}
              </p>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300"
                style={{ backgroundColor: activeMetric === metric.id ? metric.color : `${metric.color}15`, color: activeMetric === metric.id ? '#fff' : metric.color }}
              >
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="relative z-10 mt-4 text-3xl font-black text-slate-900 dark:text-white">
              {metric.prefix}{Number(metric.value).toLocaleString("en-IN")}
            </p>

            {/* Sparkline Background */}
            <div className="absolute bottom-0 left-0 w-full h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <Area type="monotone" dataKey={metric.id} stroke={metric.color} fill={metric.color} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 rounded-[2rem] border border-slate-200 bg-white/80 backdrop-blur-xl p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white tracking-tight">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            6-Month Trend ({metrics.find(m => m.id === activeMetric)?.label})
          </h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metrics.find(m => m.id === activeMetric)?.color || "#6366f1"} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={metrics.find(m => m.id === activeMetric)?.color || "#6366f1"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99, 102, 241, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone"
                  dataKey={activeMetric} 
                  stroke={metrics.find(m => m.id === activeMetric)?.color || "#6366f1"} 
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorMetric)" 
                  activeDot={{ r: 8, strokeWidth: 0, fill: metrics.find(m => m.id === activeMetric)?.color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Comparison Chart */}
        <div className="rounded-[2rem] border border-slate-200 bg-white/80 backdrop-blur-xl p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="mb-6 text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Growth Comparison
          </h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                <Area type="monotone" dataKey="organizations" stroke="#3b82f6" strokeWidth={3} fill="url(#colorOrgs)" />
                <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Recent Organizations
          </h3>
          <p className="text-sm text-slate-500">Newly onboarded organizations on the platform.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 font-black uppercase tracking-[0.15em] text-[10px] text-slate-400">Organization</th>
                <th className="px-6 py-4 font-black uppercase tracking-[0.15em] text-[10px] text-slate-400">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-[0.15em] text-[10px] text-slate-400">Joined Date</th>
                <th className="px-6 py-4 text-right font-black uppercase tracking-[0.15em] text-[10px] text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoadingOrgs ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center"><Loader2 className="animate-spin h-6 w-6 text-indigo-500 mx-auto" /></td>
                </tr>
              ) : topOrganizations.length > 0 ? (
                topOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">{org.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{org.code}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${org.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {org.subscriptionStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                      {new Date(org.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/super-admin/organizations/${org.id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">
                        View <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No organizations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
