// Shared hooks and small utilities used by both variants
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Streaming text effect — fakes a token-by-token reveal
function useStreamingText(text, { speed = 12, autoStart = true } = {}) {
  const [output, setOutput] = useState('');
  const [done, setDone] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const tRef = useRef();

  const start = useCallback(() => {
    setOutput('');
    setDone(false);
    setStreaming(true);
    let i = 0;
    clearInterval(tRef.current);
    tRef.current = setInterval(() => {
      // reveal a few chars per tick, with occasional pauses on punctuation
      const step = Math.max(1, Math.round(2 + Math.random() * 4));
      i += step;
      if (i >= text.length) {
        setOutput(text);
        setDone(true);
        setStreaming(false);
        clearInterval(tRef.current);
      } else {
        setOutput(text.slice(0, i));
      }
    }, speed);
  }, [text, speed]);

  const cancel = useCallback(() => {
    clearInterval(tRef.current);
    setOutput(text);
    setDone(true);
    setStreaming(false);
  }, [text]);

  const reset = useCallback(() => {
    clearInterval(tRef.current);
    setOutput('');
    setDone(false);
    setStreaming(false);
  }, []);

  useEffect(() => {
    if (autoStart) start();
    return () => clearInterval(tRef.current);
    // eslint-disable-next-line
  }, []);

  return { output, done, streaming, start, cancel, reset };
}

// Tiny markdown renderer for the response: bold, code, lists, paragraphs
function renderMarkdown(text) {
  if (!text) return [];
  // Split by double newlines into blocks
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    // Ordered list
    if (/^\d+\.\s/.test(block.trim())) {
      const items = block.split('\n').filter(Boolean);
      return React.createElement('ol', { key: bi, className: 'md-ol' },
        items.map((it, i) => {
          const content = it.replace(/^\d+\.\s/, '');
          return React.createElement('li', { key: i, dangerouslySetInnerHTML: { __html: inlineMd(content) } });
        })
      );
    }
    // Heading-ish (bold whole-block)
    if (/^\*\*[^*]+\*\*$/.test(block.trim())) {
      return React.createElement('h4', { key: bi, className: 'md-h', dangerouslySetInnerHTML: { __html: inlineMd(block.trim()) } });
    }
    return React.createElement('p', { key: bi, className: 'md-p', dangerouslySetInnerHTML: { __html: inlineMd(block) } });
  });
}

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

// Github issue hover preview — used in both variants, themed via CSS class
function IssueHover({ issue, theme }) {
  if (!issue) return null;
  return React.createElement('div', { className: `issue-hover issue-hover--${theme}` },
    React.createElement('div', { className: 'ih-head' },
      React.createElement('span', { className: 'ih-num' }, `#${issue.num}`),
      React.createElement('span', { className: `ih-state ${issue.closed ? 'closed' : 'open'}` }, issue.closed ? '● closed' : '● open'),
      React.createElement('span', { className: 'ih-prio' }, issue.priority),
    ),
    React.createElement('div', { className: 'ih-title' }, issue.title),
    React.createElement('div', { className: 'ih-body' }, issue.body),
    React.createElement('div', { className: 'ih-meta' },
      React.createElement('span', { className: 'ih-assignee' }, `@${issue.assignee}`),
      React.createElement('span', { className: 'ih-updated' }, issue.updated),
    ),
    React.createElement('div', { className: 'ih-labels' },
      issue.labels.map((l, i) => React.createElement('span', { key: i, className: 'ih-label' }, l))
    ),
  );
}

// Hook: managed hover preview with positioning
function useHoverPreview() {
  const [hovered, setHovered] = useState(null); // { issue, x, y }
  const onEnter = (issue, e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHovered({ issue, x: r.right + 12, y: r.top });
  };
  const onLeave = () => setHovered(null);
  return { hovered, onEnter, onLeave };
}

Object.assign(window, { useStreamingText, renderMarkdown, IssueHover, useHoverPreview });
