// App.jsx — orchestration : skills, token, history, run, panneaux droits.

import { useCallback, useEffect, useRef, useState } from "react";
import BridgeStatus from "./components/BridgeStatus.jsx";
import TokenSetup from "./components/TokenSetup.jsx";
import SkillRunner from "./components/SkillRunner.jsx";
import StreamPanel from "./components/StreamPanel.jsx";
import History from "./components/History.jsx";
import HubSpotQueue from "./components/HubSpotQueue.jsx";
import GitHubBoard from "./components/GitHubBoard.jsx";
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
  const [historyEntries, setHistoryEntries] = useState(HistStore.list());
  const abortRef = useRef(null);

  // Charge la liste des skills quand on a un token valide.
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
      // Sauve dans l'historique sur fin propre.
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
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-lx-border bg-lx-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Lynxter Control</h1>
          <span className="text-xs text-lx-muted">v0.1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <BridgeStatus baseUrl={baseUrl} />
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-lx-muted hover:text-lx-err"
            title="Effacer token + repartir au setup"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="grid h-full min-h-0 flex-1 grid-cols-[220px_1fr_300px] gap-3 p-3">
        <aside className="flex h-full min-h-0 flex-col rounded-lg border border-lx-border bg-lx-panel p-3">
          <History
            entries={historyEntries}
            onSelect={handleHistorySelect}
            onRemove={handleHistoryRemove}
            onClear={handleHistoryClear}
          />
        </aside>

        <section className="flex h-full min-h-0 flex-col gap-3">
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

        <aside className="flex h-full min-h-0 flex-col gap-3">
          <div className="h-1/2 rounded-lg border border-lx-border bg-lx-panel p-3">
            <HubSpotQueue
              baseUrl={baseUrl}
              token={token}
              onUseTicket={handleSourceClick}
            />
          </div>
          <div className="h-1/2 rounded-lg border border-lx-border bg-lx-panel p-3">
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
