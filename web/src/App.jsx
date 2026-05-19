// App.jsx — orchestration. Layout charte Lynxter : header avec logo +
// wordmark + baseline, 3 colonnes (history / runner+stream / HubSpot+GitHub).

import { useCallback, useEffect, useRef, useState } from "react";
import BridgeStatus from "./components/BridgeStatus.jsx";
import TokenSetup from "./components/TokenSetup.jsx";
import SkillRunner from "./components/SkillRunner.jsx";
import StreamPanel from "./components/StreamPanel.jsx";
import History from "./components/History.jsx";
import HubSpotQueue from "./components/HubSpotQueue.jsx";
import GitHubBoard from "./components/GitHubBoard.jsx";
import { Logo, Baseline, Wordmark, ProductName } from "./components/Brand.jsx";
import { fetchSkills, runSkill } from "./lib/api.js";
import { Token, BaseUrl, History as HistStore } from "./lib/storage.js";

export default function App() {
  const [baseUrl, setBaseUrl] = useState(BaseUrl.get());
  const [token, setToken] = useState(Token.get());
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [prompt, setPrompt] = useState("");
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  // Lazy init : on évite d'appeler HistStore.list() à chaque render.
  const [historyEntries, setHistoryEntries] = useState(() => HistStore.list());
  const abortRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchSkills(baseUrl, token)
      .then((s) => {
        if (!cancelled) setSkills(s);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.message === "auth_error") {
          Token.clear();
          setToken("");
        } else {
          setError(`Skills: ${err.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, baseUrl]);

  const handleTokenSet = (t) => {
    Token.set(t);
    setToken(t);
    setError("");
  };

  const handleBaseUrlSet = (url) => {
    BaseUrl.set(url);
    setBaseUrl(url);
  };

  const handleRun = useCallback(async () => {
    setError("");
    setEvents([]);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const body = selectedSkill
      ? { skill: selectedSkill, args: prompt }
      : { prompt };

    try {
      await runSkill(
        baseUrl,
        token,
        body,
        (eventName, data) => {
          setEvents((prev) => [...prev, { eventName, data }]);
        },
        controller.signal,
      );
      const entry = {
        startedAt: Date.now(),
        skill: selectedSkill,
        prompt,
      };
      const updated = HistStore.add(entry);
      setHistoryEntries(updated);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [baseUrl, token, selectedSkill, prompt]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleHistorySelect = (entry) => {
    setSelectedSkill(entry.skill || "");
    setPrompt(entry.prompt || "");
  };

  const handleHistoryRemove = (id) => {
    setHistoryEntries(HistStore.remove(id));
  };

  const handleHistoryClear = () => {
    HistStore.clear();
    setHistoryEntries([]);
  };

  const handleSourceClick = ({ skill, prompt: p }) => {
    setSelectedSkill(skill || "");
    setPrompt(p || "");
  };

  const handleReset = () => {
    Token.clear();
    setToken("");
  };

  if (!token) {
    return (
      <TokenSetup
        baseUrl={baseUrl}
        onTokenSet={handleTokenSet}
        onBaseUrlSet={handleBaseUrlSet}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-lx-bg">
      {/* Header — charte : logo sur fond blanc, baseline en jaune Lynxter à droite */}
      <header className="flex items-center justify-between border-b border-lx-border bg-lx-bg px-6 py-3">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div className="flex items-baseline gap-2">
            <Wordmark className="text-base" />
            <ProductName name="LYNXVIEW" />
          </div>
          <span className="ml-3 hidden border-l border-lx-border pl-3 sm:inline">
            {/* Variant "compact" gris foncé : la baseline jaune charte est
                réservée aux gros titres (text-2xl+). Ici text-xs subtle pour
                rester discret dans le header. */}
            <Baseline className="text-[0.7rem]" variant="compact" />
          </span>
        </div>
        <div className="flex items-center gap-5">
          <BridgeStatus baseUrl={baseUrl} />
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-lx-muted transition-colors hover:text-lx-err"
            title="Effacer token et repartir au setup"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main — 3 colonnes alignées à gauche (charte p.24). */}
      <main className="grid h-full min-h-0 flex-1 grid-cols-[240px_1fr_320px] gap-4 bg-lx-soft p-4">
        {/* History */}
        <aside className="lx-card flex h-full min-h-0 flex-col p-3">
          <History
            entries={historyEntries}
            onSelect={handleHistorySelect}
            onRemove={handleHistoryRemove}
            onClear={handleHistoryClear}
          />
        </aside>

        {/* Runner + stream */}
        <section className="flex h-full min-h-0 flex-col gap-4">
          <SkillRunner
            skills={skills}
            selectedSkill={selectedSkill}
            onSelectSkill={setSelectedSkill}
            prompt={prompt}
            onPromptChange={setPrompt}
            onRun={handleRun}
            onCancel={handleCancel}
            running={running}
          />
          <div className="min-h-0 flex-1">
            <StreamPanel events={events} running={running} error={error} />
          </div>
        </section>

        {/* Right rail */}
        <aside className="flex h-full min-h-0 flex-col gap-4">
          <div className="lx-card h-1/2 p-3">
            <HubSpotQueue
              baseUrl={baseUrl}
              token={token}
              onUseTicket={handleSourceClick}
            />
          </div>
          <div className="lx-card h-1/2 p-3">
            <GitHubBoard
              baseUrl={baseUrl}
              token={token}
              onUseIssue={handleSourceClick}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
