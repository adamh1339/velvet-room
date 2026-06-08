export default function MessageBubble({ message, accent }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end msg-in">
        <p
          className="max-w-[78%] rounded-xl rounded-tr-sm px-4 py-3 text-[13px] leading-relaxed"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-head)',
          }}
        >
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start msg-in">
      <p
        className="max-w-[84%] rounded-xl rounded-tl-sm px-4 py-3 text-[13px] leading-relaxed"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-sub)',
          borderRight: '1px solid var(--border-sub)',
          borderBottom: '1px solid var(--border-sub)',
          borderLeft: `1px solid ${accent}99`,
          color: 'var(--text)',
        }}
      >
        {message.text}
      </p>
    </div>
  );
}
