import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchBoard, createBoardItem, moveBoardItem, deleteBoardItem } from "../../api/board";
import { fetchDeadlines, createDeadline, updateDeadline, deleteDeadline } from "../../api/deadlines";
import "../../styles/board.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS  = { urgent: "Екстренно", planned: "Скоро", reminder: "Активний", expired: "Пройшов", birthday: "День народження" };
const STATUS_COLORS  = { urgent: "#ef4444", planned: "#f59e0b", reminder: "#22c55e", expired: "#3b82f6", birthday: "#eab308" };
const STATUS_BAR_PCT = { urgent: 25, planned: 65, reminder: 45, expired: 95, birthday: 50 };

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

function daysLabel(displayStatus, days) {
  if (displayStatus === "expired" || days === null || days < 0) return "Завершено";
  if (displayStatus === "birthday") return "Скоро день народження";
  if (days === 0) return "Сьогодні";
  if (days === 1) return "1 день залишилось";
  const m = days % 10, h = days % 100;
  if (m >= 2 && m <= 4 && !(h >= 12 && h <= 14)) return `${days} дні залишилось`;
  return `${days} днів залишилось`;
}
const DRAW_COLORS = ["#334155","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899"];
const NOTE_BG_COLORS = ["#fef9c3","#fce7f3","#dbeafe","#dcfce7","#f3e8ff"];
const DRAW_SIZES = { S: 2, M: 4, L: 7 };
const NOTE_BG_MAP = { yellow:"#fef9c3", pink:"#fce7f3", blue:"#dbeafe", green:"#dcfce7", purple:"#f3e8ff" };
const NOTE_COLOR_KEYS = ["yellow","pink","blue","green","purple"];
const NOTE_BADGE_MAP = {
  yellow: { bg: "#fde68a", color: "#92400e" },
  pink:   { bg: "#fbcfe8", color: "#9d174d" },
  blue:   { bg: "#bfdbfe", color: "#1e40af" },
  green:  { bg: "#bbf7d0", color: "#166534" },
  purple: { bg: "#e9d5ff", color: "#6b21a8" },
};
const ERASE_RADII = { S: 8, M: 16, L: 28 };

function pointSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function pathHitsEraser(d, center, radius) {
  if (!d) return false;
  const points = [];
  const re = /[ML]([-\d.]+),([-\d.]+)/g;
  let m;
  while ((m = re.exec(d)) !== null) points.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  for (let i = 0; i < points.length; i++) {
    const dist = i === 0
      ? Math.hypot(points[i].x - center.x, points[i].y - center.y)
      : pointSegmentDist(center.x, center.y, points[i-1].x, points[i-1].y, points[i].x, points[i].y);
    if (dist <= radius) return true;
  }
  return false;
}

// Splits a draw path into surviving segments after erasing zones are applied.
// Returns array of point arrays — each is a connected surviving sub-path.
function splitPathByErasure(d, zones) {
  if (!d || zones.length === 0) return [];
  const points = [];
  const re = /[ML]([-\d.]+),([-\d.]+)/g;
  let m;
  while ((m = re.exec(d)) !== null) points.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  if (points.length < 2) return [];

  // Mark each segment erased if any zone circle intersects it
  const segErased = new Array(points.length - 1).fill(false);
  for (let i = 0; i < points.length - 1; i++) {
    for (const z of zones) {
      if (pointSegmentDist(z.cx, z.cy, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y) <= z.r) {
        segErased[i] = true;
        break;
      }
    }
  }

  // Collect runs of consecutive non-erased segments
  const segs = [];
  let cur = [];
  for (let i = 0; i < segErased.length; i++) {
    if (!segErased[i]) {
      if (cur.length === 0) cur.push(points[i]);
      cur.push(points[i + 1]);
    } else {
      if (cur.length >= 2) segs.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) segs.push(cur);
  return segs;
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function parseDrawContent(content) {
  if (!content) return { stroke: "#334155", strokeWidth: 3, d: "" };
  const match = content.match(/^(#[0-9a-fA-F]{3,6})\|(\d+(?:\.\d+)?)\|(.*)$/s);
  if (match) return { stroke: match[1], strokeWidth: parseFloat(match[2]), d: match[3] };
  return { stroke: "#334155", strokeWidth: 3, d: content };
}

// ─── Deadline View Modal ──────────────────────────────────────────────────────
function DeadlineViewModal({ item, onClose }) {
  if (!item) return null;
  const today = new Date().toISOString().split("T")[0];
  const isExpired = item.deadline_date && item.deadline_date < today && item.status !== "birthday";
  const displayStatus = isExpired ? "expired" : item.status;
  const label = STATUS_LABELS[displayStatus] || item.status;
  return createPortal(
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dl-view-card">
        <span className={`dl-view-badge dl-badge ${displayStatus}`}>{label}</span>
        <div className="dl-view-title">{item.title}</div>
        {item.author_name && <div className="dl-view-sub">{item.author_name}</div>}
        {item.deadline_date && (
          <div className="dl-view-meta">
            <span className="dl-view-date">{formatDate(item.deadline_date)}</span>
            <span className={`dl-view-status dl-badge ${displayStatus}`}>{label}</span>
          </div>
        )}
        {item.description && (
          <div className="dl-view-desc">{item.description}</div>
        )}
        {!item.description && <div className="dl-view-no-desc">Опис відсутній</div>}
        <div className="dl-view-divider" />
        <button className="dl-view-close" onClick={onClose}>Закрити</button>
      </div>
    </div>,
    document.body
  );
}

// ─── Deadline Card ────────────────────────────────────────────────────────────
function DeadlineCard({ item, isAdmin, onDelete, onView }) {
  const today = new Date().toISOString().split("T")[0];
  const isExpired = item.deadline_date && item.deadline_date < today && item.status !== "birthday";
  const displayStatus = isExpired ? "expired" : item.status;
  const color = STATUS_COLORS[displayStatus] || "#3b82f6";
  const barPct = STATUS_BAR_PCT[displayStatus] ?? 50;
  const days = daysUntil(item.deadline_date);
  const label = STATUS_LABELS[displayStatus] || item.status;
  return (
    <div className="dl-item" style={{ borderLeft: `3px solid ${color}` }} onClick={() => onView(item)}>
      <div className="dl-item-top">
        <span className="dl-title">{item.title}</span>
        <span className={`dl-badge ${displayStatus}`}>{label}</span>
      </div>
      {item.deadline_date && (
        <div className="dl-item-sub">
          <span>{formatDate(item.deadline_date)}</span>
        </div>
      )}
      <div className="dl-progress-track">
        <div className="dl-progress-bar" style={{ width: `${barPct}%`, background: color }} />
      </div>
      <div className="dl-item-bottom">
        <span className="dl-days-text">{daysLabel(displayStatus, days)}</span>
      </div>
      {isAdmin && item.status !== "birthday" && item.id != null && (
        <button className="icon-btn dl-del-btn" title="Видалити" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Auto-status from date ────────────────────────────────────────────────────
function autoStatus(dateStr) {
  if (!dateStr) return "planned";
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 7) return "planned";
  return "reminder";
}

// ─── Deadline Form Modal ──────────────────────────────────────────────────────
function DeadlineFormModal({ editItem, total, token, groupId, onRefresh, onClose }) {
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [date, setDate] = useState(editItem?.deadline_date ?? "");
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [saving, setSaving] = useState(false);

  const computedStatus = autoStatus(date);
  const statusLabel = STATUS_LABELS[computedStatus] || computedStatus;
  const statusColor = STATUS_COLORS[computedStatus] || "#3b82f6";

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      const sendStatus = computedStatus === "expired" ? "planned" : computedStatus;
      const payload = { title: title.trim(), deadline_date: date, status: sendStatus, description: description.trim() || null };
      if (editItem) await updateDeadline(token, groupId, editItem.id, payload);
      else await createDeadline(token, groupId, payload);
      await onRefresh();
      onClose();
    } catch { /* silent */ }
    setSaving(false);
  };

  const num = editItem && total ? `${total.indexOf(editItem) + 1} з ${total.length}` : null;

  return createPortal(
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dl-form-modal">
        <div className="dl-form-modal-top">
          <div className="dl-form-modal-title">
            {editItem ? `Дедлайн${num ? ` ${num}` : ""}` : "Новий дедлайн"}
          </div>

          <div className="dl-form-field">
            <div className="dl-form-lbl">Назва дедлайну</div>
            <input className="dl-form-input" placeholder="Введіть назву..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="dl-form-field">
            <div className="dl-form-lbl">Дата здачі</div>
            <input className="dl-form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="dl-form-field">
            <div className="dl-form-lbl">Детальний опис</div>
            <textarea className="dl-form-input dl-form-textarea" placeholder="Деталі завдання..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="dl-form-field">
            <div className="dl-form-lbl">Статус (визначається автоматично)</div>
            <div className="dl-form-status-row">
              <span className="dl-badge" style={{ background: statusColor + "22", color: statusColor }}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="dl-form-modal-actions">
          <button className="dl-form-btn dl-form-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "Зберегти"}
          </button>
          <button className="dl-form-btn dl-form-btn-cancel" onClick={onClose}>Скасувати</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Deadlines Panel ──────────────────────────────────────────────────────────
function DeadlinesPanel({ deadlines, isAdmin, token, groupId, onRefresh }) {
  const [formOpen, setFormOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const openAdd = () => setFormOpen(true);
  const closeForm = () => setFormOpen(false);

  const handleDelete = async id => {
    if (!window.confirm("Видалити дедлайн?")) return;
    try { await deleteDeadline(token, groupId, id); await onRefresh(); } catch { /* silent */ }
  };

  return (
    <div className="deadlines-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Дедлайни
        </h3>
        <button className="card-menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </button>
      </div>

      <div className="deadlines-body">
        <div className="deadlines-grid">
          {deadlines.length === 0 && <div className="dl-empty">Немає активних дедлайнів</div>}
          {deadlines.map((item, i) => (
            <DeadlineCard key={item.id ?? `bday-${i}`} item={item} isAdmin={isAdmin} onDelete={handleDelete} onView={setViewItem} />
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="dl-add-fab" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className="ptool-label">Add</span>
        </div>
      )}

      {formOpen && isAdmin && (
        <DeadlineFormModal editItem={null} total={deadlines} token={token} groupId={groupId} onRefresh={onRefresh} onClose={closeForm} />
      )}

      {viewItem && <DeadlineViewModal item={viewItem} onClose={() => setViewItem(null)} />}
    </div>
  );
}

// ─── Tool Modal (for adding notes/photos) ─────────────────────────────────────
function ToolModal({ type, noteColorIdx, onColorChange, onConfirm, onClose }) {
  const [value, setValue] = useState("");
  const isText = type === "text";
  return (
    <div className="tool-modal-backdrop open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tool-modal">
        <div className="tool-modal-top">
          <span className={`tool-modal-badge ${isText ? "badge-text" : "badge-photo"}`}>{isText ? "ТЕКСТ" : "ФОТО"}</span>
          <div className="tool-modal-title">{isText ? "Додати текст" : "Додати фото"}</div>
          <div className="tool-modal-sub">{isText ? "Введіть текст для записки" : "Вставте URL або Google Drive посилання"}</div>
          <div className="tool-modal-input">
            {isText
              ? <textarea placeholder="Введіть текст..." value={value} onChange={e => setValue(e.target.value)} autoFocus />
              : <input type="text" placeholder="https://..." value={value} onChange={e => setValue(e.target.value)} autoFocus />
            }
          </div>
          {isText && (
            <div style={{ width: "100%" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>Колір фону</div>
              <div className="color-swatches">
                {NOTE_BG_COLORS.map((c, i) => (
                  <div key={c} className={`color-swatch${noteColorIdx === i ? " selected" : ""}`} style={{ background: c }} onClick={() => onColorChange(i)} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="tool-modal-divider" />
        <div className="tool-modal-actions">
          <button className="tm-btn tm-btn-primary" onClick={() => { if (value.trim()) onConfirm(value.trim()); }}>Додати на дошку</button>
          <button className="tm-btn tm-btn-secondary" onClick={onClose}>Закрити</button>
        </div>
      </div>
    </div>
  );
}

// ─── Info Board ───────────────────────────────────────────────────────────────
function InfoBoard({ items, isAdmin, token, groupId, currentUser, onRefresh }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState(null); // null=pan | 'draw' | 'erase'
  const [blurActive, setBlurActive] = useState(true);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawSize, setDrawSize] = useState("S");
  const [eraseSize, setEraseSize] = useState("M");
  const [toolModal, setToolModal] = useState(null); // null | 'text' | 'photo'
  const [noteColorIdx, setNoteColorIdx] = useState(0);

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const activeToolRef = useRef(null);
  const itemsRef = useRef(items);
  const drawColorRef = useRef(DRAW_COLORS[0]);
  const drawSizeRef = useRef("S");
  const eraseSizeRef = useRef("M");
  const noteColorIdxRef = useRef(0);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  const isDrawingRef = useRef(false);
  const drawPathRef = useRef([]);
  const tempSvgPathRef = useRef(null);

  const draggingIdRef = useRef(null);
  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const isDraggingItemRef = useRef(false);
  const isErasingRef = useRef(false);
  const eraseQueueRef = useRef(new Set());
  const eraseDrawHitsRef = useRef(new Set());
  const eraseZonesRef = useRef([]);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { drawColorRef.current = drawColor; }, [drawColor]);
  useEffect(() => { drawSizeRef.current = drawSize; }, [drawSize]);
  useEffect(() => { eraseSizeRef.current = eraseSize; }, [eraseSize]);
  useEffect(() => { noteColorIdxRef.current = noteColorIdx; }, [noteColorIdx]);

  const setTool = tool => setActiveTool(prev => prev === tool ? null : tool);

  const applyTransform = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate(${offsetRef.current.x}px,${offsetRef.current.y}px) scale(${scaleRef.current})`;
    }
  }, []);

  const zoom = useCallback(factor => {
    setScale(prev => {
      const next = Math.min(3, Math.max(0.2, prev * factor));
      scaleRef.current = next;
      applyTransform();
      return next;
    });
  }, [applyTransform]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(e.deltaY > 0 ? 0.9 : 1.1); } };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom]);

  const clientToCanvas = (cx, cy) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (cx - rect.left - offsetRef.current.x) / scaleRef.current, y: (cy - rect.top - offsetRef.current.y) / scaleRef.current };
  };

  const doEraseAt = (clientX, clientY) => {
    const center = clientToCanvas(clientX, clientY);
    const radius = ERASE_RADII[eraseSizeRef.current] / scaleRef.current;
    eraseZonesRef.current.push({ cx: center.x, cy: center.y, r: radius });
    for (const item of itemsRef.current) {
      if (item.item_type === "draw") {
        if (eraseDrawHitsRef.current.has(item.id)) continue;
        const { d } = parseDrawContent(item.content);
        if (pathHitsEraser(d, center, radius)) eraseDrawHitsRef.current.add(item.id);
      } else if (item.item_type === "pin") {
        if (!eraseQueueRef.current.has(item.id) && Math.hypot(center.x - item.pos_x, center.y - item.pos_y) <= radius + 15)
          eraseQueueRef.current.add(item.id);
      }
    }
  };

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const handleContainerPointerDown = e => {
    if (activeToolRef.current === "erase") {
      if (e.target.closest(".canvas-toolbar, .board-blur-overlay")) return;
      isErasingRef.current = true;
      eraseQueueRef.current = new Set();
      eraseDrawHitsRef.current = new Set();
      eraseZonesRef.current = [];
      doEraseAt(e.clientX, e.clientY);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (e.target !== containerRef.current && e.target !== canvasRef.current && e.target !== svgRef.current) return;
    if (activeToolRef.current === "draw") {
      isDrawingRef.current = true;
      const pos = clientToCanvas(e.clientX, e.clientY);
      drawPathRef.current = [pos];
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", drawColorRef.current);
      path.setAttribute("stroke-width", DRAW_SIZES[drawSizeRef.current] + "px");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("d", `M${pos.x},${pos.y}`);
      svgRef.current?.appendChild(path);
      tempSvgPathRef.current = path;
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { ...offsetRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleContainerPointerMove = e => {
    if (isErasingRef.current) {
      doEraseAt(e.clientX, e.clientY);
      return;
    }
    if (isDrawingRef.current && activeToolRef.current === "draw") {
      const pos = clientToCanvas(e.clientX, e.clientY);
      drawPathRef.current.push(pos);
      const d = drawPathRef.current.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
      tempSvgPathRef.current?.setAttribute("d", d);
      return;
    }
    if (isPanningRef.current) {
      offsetRef.current = {
        x: panOffsetStartRef.current.x + e.clientX - panStartRef.current.x,
        y: panOffsetStartRef.current.y + e.clientY - panStartRef.current.y,
      };
      applyTransform();
    }
  };

  const handleContainerPointerUp = async () => {
    if (isErasingRef.current) {
      isErasingRef.current = false;
      const ids = [...eraseQueueRef.current];
      const drawHits = [...eraseDrawHitsRef.current];
      const zones = eraseZonesRef.current;
      eraseQueueRef.current = new Set();
      eraseDrawHitsRef.current = new Set();
      eraseZonesRef.current = [];

      const ops = [];
      for (const id of ids) ops.push(deleteBoardItem(token, groupId, id));
      for (const id of drawHits) {
        const item = itemsRef.current.find(i => i.id === id);
        if (!item) continue;
        const { stroke, strokeWidth, d } = parseDrawContent(item.content);
        const segs = splitPathByErasure(d, zones);
        ops.push(deleteBoardItem(token, groupId, id));
        for (const segPts of segs) {
          const newD = segPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
          ops.push(createBoardItem(token, groupId, { item_type: "draw", content: `${stroke}|${strokeWidth}|${newD}`, pos_x: 0, pos_y: 0 }));
        }
      }
      if (ops.length > 0) {
        try { await Promise.all(ops); await onRefresh(); } catch { /* silent */ }
      }
      return;
    }
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const pts = drawPathRef.current;
      if (pts.length > 1) {
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        const content = `${drawColorRef.current}|${DRAW_SIZES[drawSizeRef.current]}|${d}`;
        try { await createBoardItem(token, groupId, { item_type: "draw", content, pos_x: 0, pos_y: 0 }); await onRefresh(); } catch { /* silent */ }
      }
      tempSvgPathRef.current?.remove();
      tempSvgPathRef.current = null;
      drawPathRef.current = [];
      return;
    }
    isPanningRef.current = false;
    setOffset({ ...offsetRef.current });
  };

  const handleItemPointerDown = (e, item) => {
    if (activeToolRef.current === "erase") return;
    e.stopPropagation();
    draggingIdRef.current = item.id;
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = { x: item.pos_x, y: item.pos_y };
    isDraggingItemRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleItemPointerMove = (e, itemId) => {
    if (draggingIdRef.current !== itemId) return;
    const clientDx = e.clientX - dragStartClientRef.current.x;
    const clientDy = e.clientY - dragStartClientRef.current.y;
    if (!isDraggingItemRef.current && (Math.abs(clientDx) > 3 || Math.abs(clientDy) > 3)) {
      isDraggingItemRef.current = true;
    }
    if (isDraggingItemRef.current) {
      e.currentTarget.style.left = (dragStartPosRef.current.x + clientDx / scaleRef.current) + "px";
      e.currentTarget.style.top  = (dragStartPosRef.current.y + clientDy / scaleRef.current) + "px";
    }
  };

  const handleItemPointerUp = async (e, item) => {
    if (isDraggingItemRef.current) {
      const dx = (e.clientX - dragStartClientRef.current.x) / scaleRef.current;
      const dy = (e.clientY - dragStartClientRef.current.y) / scaleRef.current;
      try { await moveBoardItem(token, groupId, item.id, { pos_x: dragStartPosRef.current.x + dx, pos_y: dragStartPosRef.current.y + dy }); await onRefresh(); } catch { /* silent */ }
    }
    draggingIdRef.current = null;
    isDraggingItemRef.current = false;
  };

  // ── Add items ─────────────────────────────────────────────────────────────
  const getCenter = () => {
    const el = containerRef.current;
    if (!el) return { x: 100, y: 100 };
    return { x: (el.clientWidth / 2 - offsetRef.current.x) / scaleRef.current, y: (el.clientHeight / 2 - offsetRef.current.y) / scaleRef.current };
  };

  const handleAddNote = async text => {
    setToolModal(null);
    const { x, y } = getCenter();
    const color = NOTE_COLOR_KEYS[noteColorIdxRef.current] || "yellow";
    try { await createBoardItem(token, groupId, { item_type: "note", content: text, color, pos_x: x - 95, pos_y: y - 60 }); await onRefresh(); } catch { /* silent */ }
  };

  const handleAddPhoto = async url => {
    setToolModal(null);
    const { x, y } = getCenter();
    try { await createBoardItem(token, groupId, { item_type: "photo", content: url, pos_x: x - 95, pos_y: y - 80 }); await onRefresh(); } catch { /* silent */ }
  };

  const handleDeleteItem = async id => {
    try { await deleteBoardItem(token, groupId, id); await onRefresh(); } catch { /* silent */ }
  };

  // ── Render canvas items ───────────────────────────────────────────────────
  const renderItem = item => {
    if (item.item_type === "draw") return null;
    const isErasing = activeTool === "erase";
    const canDelete = isAdmin || item.author_id === currentUser?.id;
    const commonProps = {
      onPointerDown: e => handleItemPointerDown(e, item),
      onPointerMove: e => { if (!isErasing) handleItemPointerMove(e, item.id); },
      onPointerUp: e => { if (!isErasing) handleItemPointerUp(e, item); },
    };

    if (item.item_type === "note") {
      const bg = NOTE_BG_MAP[item.color] || "#fef9c3";
      const badge = NOTE_BADGE_MAP[item.color] || NOTE_BADGE_MAP.yellow;
      return (
        <div key={item.id} className="note-card" style={{ left: item.pos_x, top: item.pos_y, zIndex: item.z_index, background: bg, touchAction: "none" }} {...commonProps}>
          <div className="note-card-header">
            <span className="note-card-type" style={{ background: badge.bg, color: badge.color }}>ТЕКСТ</span>
            {canDelete && !isErasing && (
              <button className="note-card-del" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}>×</button>
            )}
          </div>
          <div className="note-card-body">{item.content}</div>
        </div>
      );
    }

    if (item.item_type === "photo") {
      const src = item.content?.includes("drive.google.com")
        ? item.content.replace(/\/file\/d\/(.+?)\/.*/, "/uc?export=view&id=$1")
        : item.content;
      return (
        <div key={item.id} className="note-card" style={{ left: item.pos_x, top: item.pos_y, zIndex: item.z_index, touchAction: "none" }} {...commonProps}>
          <div className="note-card-header">
            <span className="note-card-type photo-type">ФОТО</span>
            {canDelete && !isErasing && (
              <button className="note-card-del" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}>×</button>
            )}
          </div>
          <div className="note-photo-wrap">
            <img src={src} alt="board" onError={e => { e.target.style.display = "none"; }} />
          </div>
        </div>
      );
    }

    if (item.item_type === "pin") {
      return (
        <div key={item.id} className="board-pin" style={{ left: item.pos_x, top: item.pos_y, zIndex: item.z_index, touchAction: "none" }} {...commonProps}>
          <div className="pin-head" />
        </div>
      );
    }

    return null;
  };

  const canvasClass = ["board-canvas", activeTool === null ? "panning" : "", activeTool === "draw" ? "drawing" : "", activeTool === "erase" ? `erasing erasing-${eraseSize.toLowerCase()}` : ""].filter(Boolean).join(" ");

  return (
    <div className="board-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          Інфо Дошка
        </h3>
        <button className="card-menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </button>
      </div>

      <div className="info-board-container" ref={containerRef} onPointerDown={handleContainerPointerDown} onPointerMove={handleContainerPointerMove} onPointerUp={handleContainerPointerUp}>
        {/* Blur overlay */}
        <div className={`board-blur-overlay${blurActive ? "" : " hidden"}`}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", zIndex: 1, color: "var(--text-main)" }}>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <span className="hidden-label">Вміст приховано</span>
          <button className="reveal-btn" onClick={() => setBlurActive(false)}>Відобразити вміст</button>
        </div>

        {/* Canvas */}
        <div className={canvasClass} ref={canvasRef}>
          <svg ref={svgRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 0 }}>
            {items.filter(i => i.item_type === "draw").map(item => {
              const { stroke, strokeWidth, d } = parseDrawContent(item.content);
              return (
                <path key={item.id} d={d} stroke={stroke} strokeWidth={strokeWidth + "px"} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              );
            })}
          </svg>
          {items.map(renderItem)}
        </div>

        {/* Floating pill toolbar */}
        <div className="canvas-toolbar">
          {activeTool === "draw" && (
            <div className="tool-sub-panel">
              {DRAW_COLORS.map(c => (
                <div key={c} className={`sub-panel-dot${drawColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setDrawColor(c)} />
              ))}
              <div className="sp-divider" />
              <div className="sub-panel-size">
                {["S","M","L"].map(s => (
                  <button key={s} className={`sp-size-btn${drawSize === s ? " sel" : ""}`} onClick={() => setDrawSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {activeTool === "erase" && (
            <div className="tool-sub-panel">
              <div className="sub-panel-size">
                {["S","M","L"].map(s => (
                  <button key={s} className={`sp-size-btn${eraseSize === s ? " sel" : ""}`} onClick={() => setEraseSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <button className={`tool-btn${activeTool === "draw" ? " active" : ""}`} onClick={() => setTool("draw")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            <span className="ptool-label">Draw</span>
          </button>
          <button className={`tool-btn${activeTool === "erase" ? " erase-active" : ""}`} onClick={() => setTool("erase")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16 14 5l7 7-1 8z"/><line x1="6" y1="14" x2="10" y2="18"/></svg>
            <span className="ptool-label">Erase</span>
          </button>
          <button className={`tool-btn${activeTool === null ? " active" : ""}`} onClick={() => setActiveTool(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M6 14a4 4 0 0 0 .6 2.1L9 20h6l2-2.3A10 10 0 0 0 18 14v-3a2 2 0 0 0-4 0"/></svg>
            <span className="ptool-label">Pan</span>
          </button>
          <div className="tool-divider" />
          <button className="tool-btn" onClick={() => { setActiveTool(null); setToolModal("text"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            <span className="ptool-label">Text</span>
          </button>
          <button className="tool-btn" onClick={() => { setActiveTool(null); setToolModal("photo"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span className="ptool-label">Photo</span>
          </button>
          <div className="tool-divider" />
          <button className="tool-btn" onClick={() => zoom(1.2)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span className="ptool-label">+</span>
          </button>
          <button className="tool-btn" onClick={() => zoom(0.83)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span className="ptool-label">–</span>
          </button>
          <button className="tool-btn" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 }; applyTransform(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/></svg>
            <span className="ptool-label">Reset</span>
          </button>
        </div>
      </div>

      {toolModal && (
        <ToolModal
          type={toolModal}
          noteColorIdx={noteColorIdx}
          onColorChange={setNoteColorIdx}
          onConfirm={toolModal === "text" ? handleAddNote : handleAddPhoto}
          onClose={() => setToolModal(null)}
        />
      )}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
const Board = () => {
  const { groupId } = useParams();
  const { token, user } = useAuth();
  const [boardItems, setBoardItems] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadAll = useCallback(async () => {
    if (!token || !groupId) return;
    try {
      const [boardRes, dlRes] = await Promise.all([fetchBoard(token, groupId), fetchDeadlines(token, groupId)]);
      setBoardItems(boardRes.data.items);
      setIsAdmin(boardRes.data.is_admin);
      setDeadlines(dlRes.data.items);
    } catch { /* silent */ }
  }, [token, groupId]);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 5000); return () => clearInterval(id); }, [loadAll]);

  return (
    <div className="home-wrapper">
      <DeadlinesPanel deadlines={deadlines} isAdmin={isAdmin} token={token} groupId={groupId} onRefresh={loadAll} />
      <InfoBoard items={boardItems} isAdmin={isAdmin} token={token} groupId={groupId} currentUser={user} onRefresh={loadAll} />
    </div>
  );
};

export default Board;
