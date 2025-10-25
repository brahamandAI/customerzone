import React, { useEffect, useRef, useState } from 'react';

// Colors from existing project (teal/white gradient palette)
const ACCENT = '#008080';

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export default function LoginDemoOverlay({ targetSelector = '#login-demo-area' }) {
  const cursorRef = useRef(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const moveCursorTo = async (x, y, duration = 700) => {
      const el = cursorRef.current;
      if (!el) return;
      const startRect = el.getBoundingClientRect();
      const startX = startRect.left;
      const startY = startRect.top;
      const dx = x - startX;
      const dy = y - startY;
      const start = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          if (cancelled) return resolve();
          const t = Math.min(1, (now - start) / duration);
          const k = easeInOut(t);
          el.style.transform = `translate(${startX + dx * k}px, ${startY + dy * k}px)`;
          if (t < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
    };

    const moveToElement = async (el, duration = 700, offset = { x: 6, y: 10 }) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      await moveCursorTo(r.left + r.width / 2 + offset.x, r.top + r.height / 2 + offset.y, duration);
    };

    const clickElement = async (el) => {
      if (!el) return;
      el.classList.add('demo-click');
      el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      el.click();
      await wait(180);
      el.classList.remove('demo-click');
    };

    const typeInto = async (input, text, perChar = 60) => {
      if (!input) return;
      input.focus();
      input.value = '';
      for (let i = 0; i < text.length; i++) {
        if (cancelled) return;
        input.value += text[i];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(perChar + Math.random() * 40);
      }
    };

    (async () => {
      try {
        const root = document.querySelector(targetSelector);
        if (!root) return setRunning(false);

        // Initialize cursor position
        const rootRect = root.getBoundingClientRect();
        cursorRef.current.style.transform = `translate(${rootRect.left + 20}px, ${rootRect.top + 20}px)`;

        // Elements to interact with
        const tabPassword = document.getElementById('tab-password');
        const email = document.getElementById('login-email');
        const password = document.getElementById('login-password');
        const submit = document.getElementById('login-submit');

        // Click password tab (for demo bounce)
        await moveToElement(tabPassword, 600);
        await clickElement(tabPassword);
        await wait(200);

        // Type email
        await moveToElement(email, 800);
        await clickElement(email);
        await typeInto(email, 'submitter@rakshaksecuritas.com');

        // Type password
        await moveToElement(password, 800);
        await clickElement(password);
        await typeInto(password, 'submitter123');

        // Click submit
        await moveToElement(submit, 900);
        await clickElement(submit);

        // Finish
        await wait(600);
      } finally {
        if (!cancelled) setRunning(false);
      }
    })();

    return () => { cancelled = true; };
  }, [running, targetSelector]);

  return (
    <>
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 16,
          height: 24,
          zIndex: 9999,
          pointerEvents: 'none',
          transform: 'translate(-1000px,-1000px)',
          transition: 'transform 0.2s',
        }}
      >
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1 L1 23 L6 16 L10 22 L12 21 L8 15 L15 15 Z" fill={ACCENT} opacity="0.9" />
          <path d="M1 1 L15 15" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
        </svg>
      </div>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setRunning(true)}
          style={{
            pointerEvents: 'auto',
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid ${ACCENT}33`,
            background: `linear-gradient(45deg, ${ACCENT}, #20B2AA)`,
            color: '#fff',
            fontWeight: 700,
            boxShadow: '0 8px 20px rgba(0,128,128,0.3)',
            cursor: 'pointer'
          }}
        >
          Play Demo
        </button>
      </div>

      <style>{`
        .demo-click { transform: scale(0.98); transition: transform 120ms ease; }
      `}</style>
    </>
  );
}


