export default function Loader({ text="Loading…" }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:16, background:"var(--bg-primary)" }}>
      <div style={{ width:48, height:48, border:"3px solid var(--border)",
        borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
      <p style={{ color:"var(--text-secondary)", fontSize:"0.9rem" }}>{text}</p>
    </div>
  );
}
