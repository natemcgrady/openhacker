"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const from = "coming";
  const to = "hacking";
  const [text, setText] = useState(from);

  useEffect(() => {
    const delay = setTimeout(() => {
      let i = from.length;
      const deleteInterval = setInterval(() => {
        i--;
        setText(from.slice(0, i));
        if (i === 0) {
          clearInterval(deleteInterval);
          let j = 0;
          const typeInterval = setInterval(() => {
            j++;
            setText(to.slice(0, j));
            if (j === to.length) clearInterval(typeInterval);
          }, 100);
        }
      }, 100);
    }, 2000);

    return () => clearTimeout(delay);
  }, []);

  return (
    <main className="container">
      <h1 className="title">Openhacker</h1>
      <p className="subtitle">
        &gt; <span className="typed">{text}</span> soon
      </p>
    </main>
  );
}
