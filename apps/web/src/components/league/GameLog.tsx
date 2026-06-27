export function GameLog({ messages }: { messages: string[] }) {
  return (
    <div className="play-log">
      <h3>Play/Result Log</h3>
      {messages.map((m, i) => (
        <div className="log-entry" key={`${m}-${i}`}>
          {m}
        </div>
      ))}
    </div>
  );
}
