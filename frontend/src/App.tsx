import { useEffect } from "react";
import { evaluate, fetchStats } from "./api";
import { useBizStore } from "./store";
import { FormPanel } from "./components/FormPanel";
import { RuleList } from "./components/RuleList";
import { StatsPanel } from "./components/StatsPanel";

export default function App() {
  const {
    form, rules, jurData, authData, 
    setRules, setJurData, setAuthData, setLoading, setError
  } = useBizStore();

  useEffect(() => {
    fetchStats()
      .then((s) => {
        setJurData(s.byJurisdiction.map((d) => ({ name: d.jurisdiction, value: d.count })));
        setAuthData(s.byAuthority.map((d) => ({ name: d.authority, value: d.count })));
      })
      .catch(() => {});
  }, [setJurData, setAuthData]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await evaluate(form);
      setRules(res.matched);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-auto max-w-7xl px-4 py-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">US Small Business Compliance Snapshot</h1>
        <span className="text-xs p-5 text-slate-600">Not legal advice • Snapshot</span>
      </header>

      <main className="flex-grow mx-auto max-w-7xl px-4 pb-10 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <FormPanel onSubmit={onSubmit} />
          <StatsPanel jurData={jurData} authData={authData} />
        </div>
        <div className="md:col-span-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-medium">Applicable rules</h2>
            <RuleList rules={rules} />
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500">
        © {new Date().getFullYear()} From authoritative sources. Not legal advice.
      </footer>
    </div>
  );

}
