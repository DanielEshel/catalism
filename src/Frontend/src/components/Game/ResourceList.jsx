import React from "react";

export default function ResourceList({ resources, count }) {
    if (!resources) {
        if (!count || count === 0) return <span style={{ fontSize: "10px", color: "#666" }}>Empty Hand</span>;
        return <span style={{ fontSize: "11px", color: "#888", fontStyle: "italic" }}>Hidden Hand ({count}) 🎴</span>;
    }
    const map = { carbonFiber: "Fiber", spaceCrystal: "Crystal", catnip: "Nip", mice: "Mice", cosmicMilk: "Milk" };
    const items = Object.entries(resources).filter(([, amt]) => amt > 0);
    if (items.length === 0) return <span style={{ fontSize: "10px", color: "#666" }}>Empty Hand</span>;
    return (
        <div style={{ fontSize: "11px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {items.map(([key, amount]) => (
                <span key={key} style={{ border: "1px solid #444", padding: "1px 3px", borderRadius: "3px", background: "#222", color: "#eee" }}>
                    {map[key] || key}: {amount}
                </span>
            ))}
        </div>
    );
}