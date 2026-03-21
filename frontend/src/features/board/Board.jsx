import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchBoard, createBoardItem, moveBoardItem, deleteBoardItem, clearBoard } from "../../api/board";
import { fetchDeadlines, createDeadline, updateDeadline, deleteDeadline } from "../../api/deadlines";
import "../../styles/board.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS = { urgent: "Терміново", planned: "Заплановано", reminder: "Нагадування", expired: "Пройшов", birthday: "День народження" };
const COLORS = ["yellow", "pink", "blue", "green", "purple"];

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function Avatar({ src, name, size = 22 }) {
  const initials = name ? name[0].toUpperCase() : "?";
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--bg-color)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0 }}>{initials}</div>;
}

// ─── Deadlines Panel ────────────────────────────────────────────────────────

function DeadlineCard({ item, isAdmin, onDelete }) {
  const today = new Date().toISOString().split("T")[0];
  const isExpired = item.deadline_date && item.deadline_date < today && item.status !== "birthday";
  const displayStatus = isExpired ? "expired" : item.status;
  const statusLabels = { urgent: "Терміново", planned: "Заплановано", reminder: "Нагадування", expired: "Пройшов", birthday: "День народження" };
  const dObj = new Date(item.deadline_date + "T00:00:00");
  const fDate = `${String(dObj.getDate()).padStart(2, "0")}.${String(dObj.getMonth() + 1).padStart(2, "0")}.${dObj.getFullYear()}`;
  return (
    <div className={`dl-card ${displayStatus}`}>
      {isAdmin && item.status !== "birthday" && item.id != null && (
        <button
          onClick={() => onDelete(item.id)}
          style={{ position: "absolute", top: 8, right: 8, background: "var(--bg-color)", border: "none", fontSize: 14, cursor: "pointer", color: "var(--text-secondary)", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
        >✕</button>
      )}
      <div className="dl-top">
        <div className="dl-title">{item.title}</div>
        <div className="dl-avatar">
          {item.author_avatar
            ? <img src={item.author_avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
            : <i className="ph ph-user" style={{ fontSize: 13, color: "var(--text-secondary)" }}></i>
          }
        </div>
      </div>
      <div className="dl-bot">
        <div className="dl-date">{fDate}</div>
        <div className={`dl-badge ${displayStatus}`}>{statusLabels[displayStatus] || displayStatus}</div>
      </div>
    </div>
  );
}

function DeadlinesPanel({ deadlines, isAdmin, token, groupId, onRefresh }) {
  const [dlForm, setDlForm] = useState({ title: "", deadline_date: "", status: "planned" });

  const handleAddDeadline = async () => {
    if (!dlForm.title.trim() || !dlForm.deadline_date) return;
    try {
      await createDeadline(token, groupId, dlForm);
      await onRefresh();
      setDlForm({ title: "", deadline_date: "", status: "planned" });
    } catch (e) { /* silent */ }
  };

  const handleDeleteDeadline = async (id) => {
    if (!window.confirm("Видалити дедлайн?")) return;
    try { await deleteDeadline(token, groupId, id); await onRefresh(); } catch (e) { /* silent */ }
  };

  return (
    <div className="deadlines-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="ph ph-push-pin" style={{ color: "var(--danger)" }}></i> Дедлайни
        </h3>
      </div>
      <div className="deadlines-grid">
        {deadlines.length === 0 && (
          <div className="dl-empty">Немає активних дедлайнів</div>
        )}
        {deadlines.map((item, i) => (
          <DeadlineCard key={item.id ?? `bday-${i}`} item={item} isAdmin={isAdmin} onDelete={handleDeleteDeadline} />
        ))}
      </div>
      {isAdmin && (
        <div className="add-dl-box">
          <span>Завдання</span>
          <input type="text" placeholder="Назва завдання" value={dlForm.title} onChange={e => setDlForm({ ...dlForm, title: e.target.value })} />
          <span>Дата</span>
          <input type="date" value={dlForm.deadline_date} onChange={e => setDlForm({ ...dlForm, deadline_date: e.target.value })} />
          <button className="btn-add" onClick={handleAddDeadline}>Додати дедлайн</button>
        </div>
      )}
    </div>
  );
}

// ─── Info Board ─────────────────────────────────────────────────────────────

function InfoBoard({ items, isAdmin, token, groupId, currentUser, onRefresh }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const selBoxRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState(null); // null|'draw'|'erase'|'select'
  const [blurActive, setBlurActive] = useState(true);

  // Refs to avoid stale closures in pointer handlers
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const activeToolRef = useRef(null);
  const itemsRef = useRef(items);

  // Panning refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  // Drawing refs
  const isDrawingRef = useRef(false);
  const drawPathRef = useRef([]);
  const tempSvgPathRef = useRef(null);

  // Selecting refs
  const isSelectingRef = useRef(false);
  const selStartRef = useRef({ x: 0, y: 0 });
  const selRectRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Dragging item refs
  const draggingIdRef = useRef(null);
  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const isDraggingItemRef = useRef(false);
  const holdTimerRef = useRef(null);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const setTool = (tool) => setActiveTool(prev => prev === tool ? null : tool);

  const applyTransform = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate(${offsetRef.current.x}px, ${offsetRef.current.y}px) scale(${scaleRef.current})`;
    }
  }, []);

  const zoom = useCallback((factor) => {
    setScale(prev => {
      const next = Math.min(3, Math.max(0.2, prev * factor));
      scaleRef.current = next;
      applyTransform();
      return next;
    });
  }, [applyTransform]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoom(e.deltaY > 0 ? 0.9 : 1.1);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom]);

  const clientToCanvas = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetRef.current.x) / scaleRef.current,
      y: (clientY - rect.top - offsetRef.current.y) / scaleRef.current,
    };
  };

  const clientToContainer = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ── Pointer handlers on container ────────────────────────────────────────
  const handleContainerPointerDown = (e) => {
    if (e.target !== containerRef.current && e.target !== canvasRef.current && e.target !== svgRef.current) return;
    if (activeToolRef.current === "draw") {
      isDrawingRef.current = true;
      const pos = clientToCanvas(e.clientX, e.clientY);
      drawPathRef.current = [pos];
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "board-draw-path");
      path.setAttribute("d", `M ${pos.x.toFixed(1)} ${pos.y.toFixed(1)}`);
      svgRef.current.appendChild(path);
      tempSvgPathRef.current = path;
      e.preventDefault();
      return;
    }
    if (activeToolRef.current === "select") {
      isSelectingRef.current = true;
      const pos = clientToContainer(e.clientX, e.clientY);
      selStartRef.current = pos;
      selRectRef.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
      if (selBoxRef.current) {
        selBoxRef.current.style.display = "block";
        selBoxRef.current.style.left = `${pos.x}px`;
        selBoxRef.current.style.top = `${pos.y}px`;
        selBoxRef.current.style.width = "0px";
        selBoxRef.current.style.height = "0px";
      }
      containerRef.current.setPointerCapture(e.pointerId);
      return;
    }
    // Pan
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { ...offsetRef.current };
    containerRef.current.setPointerCapture(e.pointerId);
    if (canvasRef.current) canvasRef.current.classList.add("panning");
  };

  const handleContainerPointerMove = (e) => {
    if (isDrawingRef.current) {
      const pos = clientToCanvas(e.clientX, e.clientY);
      drawPathRef.current.push(pos);
      if (tempSvgPathRef.current && drawPathRef.current.length > 1) {
        const d = drawPathRef.current.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        tempSvgPathRef.current.setAttribute("d", d);
      }
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (isSelectingRef.current) {
      const pos = clientToContainer(e.clientX, e.clientY);
      const sx = Math.min(pos.x, selStartRef.current.x);
      const sy = Math.min(pos.y, selStartRef.current.y);
      const sw = Math.abs(pos.x - selStartRef.current.x);
      const sh = Math.abs(pos.y - selStartRef.current.y);
      selRectRef.current = { x: sx, y: sy, w: sw, h: sh };
      if (selBoxRef.current) {
        selBoxRef.current.style.left = `${sx}px`;
        selBoxRef.current.style.top = `${sy}px`;
        selBoxRef.current.style.width = `${sw}px`;
        selBoxRef.current.style.height = `${sh}px`;
      }
      return;
    }
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      offsetRef.current = { x: panOffsetStartRef.current.x + dx, y: panOffsetStartRef.current.y + dy };
      applyTransform();
    }
  };

  const handleContainerPointerUp = async (e) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (tempSvgPathRef.current) { tempSvgPathRef.current.remove(); tempSvgPathRef.current = null; }
      const pts = drawPathRef.current;
      if (pts.length > 2) {
        const simplified = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
          const prev = simplified[simplified.length - 1];
          const cur = pts[i];
          if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 2) simplified.push(cur);
        }
        const d = simplified.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        try { await createBoardItem(token, groupId, { item_type: "draw", content: d, pos_x: 0, pos_y: 0 }); await onRefresh(); } catch { /* silent */ }
      }
      drawPathRef.current = [];
      return;
    }
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      if (selBoxRef.current) selBoxRef.current.style.display = "none";
      const r = selRectRef.current;
      if (r.w > 5 && r.h > 5) {
        const toDelete = itemsRef.current.filter(item => {
          if (item.item_type === "draw") return false;
          const px = item.pos_x * scaleRef.current + offsetRef.current.x;
          const py = item.pos_y * scaleRef.current + offsetRef.current.y;
          return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
        });
        if (toDelete.length > 0 && window.confirm(`Видалити ${toDelete.length} елемент(ів)?`)) {
          await Promise.all(toDelete.map(it => deleteBoardItem(token, groupId, it.id).catch(() => {})));
          await onRefresh();
        }
      }
      return;
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setOffset({ ...offsetRef.current });
      if (canvasRef.current) canvasRef.current.classList.remove("panning");
    }
  };

  // ── Item pointer handlers ─────────────────────────────────────────────────
  const handleItemPointerDown = (e, item) => {
    e.stopPropagation();
    if (activeToolRef.current === "erase") {
      deleteBoardItem(token, groupId, item.id).then(onRefresh).catch(() => {});
      return;
    }
    if (activeToolRef.current === "draw" || activeToolRef.current === "select") return;

    draggingIdRef.current = item.id;
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = { x: item.pos_x, y: item.pos_y };
    isDraggingItemRef.current = false;

    // 2-second hold to delete
    holdTimerRef.current = setTimeout(() => {
      if (!isDraggingItemRef.current && draggingIdRef.current === item.id) {
        if (window.confirm("Видалити елемент?")) {
          deleteBoardItem(token, groupId, item.id).then(onRefresh).catch(() => {});
        }
        draggingIdRef.current = null;
      }
    }, 2000);

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleItemPointerMove = (e, itemId) => {
    if (draggingIdRef.current !== itemId) return;
    const dx = (e.clientX - dragStartClientRef.current.x) / scaleRef.current;
    const dy = (e.clientY - dragStartClientRef.current.y) / scaleRef.current;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDraggingItemRef.current = true;
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    }
    if (!isDraggingItemRef.current) return;
    const el = e.currentTarget;
    el.style.left = `${dragStartPosRef.current.x + dx}px`;
    el.style.top = `${dragStartPosRef.current.y + dy}px`;
  };

  const handleItemPointerUp = async (e, item) => {
    if (draggingIdRef.current !== item.id) return;
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (isDraggingItemRef.current) {
      const dx = (e.clientX - dragStartClientRef.current.x) / scaleRef.current;
      const dy = (e.clientY - dragStartClientRef.current.y) / scaleRef.current;
      const newX = dragStartPosRef.current.x + dx;
      const newY = dragStartPosRef.current.y + dy;
      try { await moveBoardItem(token, groupId, item.id, { pos_x: newX, pos_y: newY }); await onRefresh(); } catch { /* silent */ }
    }
    draggingIdRef.current = null;
    isDraggingItemRef.current = false;
  };

  // ── Add items ─────────────────────────────────────────────────────────────
  const getCenter = () => {
    const el = containerRef.current;
    if (!el) return { x: 100, y: 100 };
    return {
      x: (el.clientWidth / 2 - offsetRef.current.x) / scaleRef.current,
      y: (el.clientHeight / 2 - offsetRef.current.y) / scaleRef.current,
    };
  };

  const addNote = async () => {
    const text = window.prompt("Текст нотатки:");
    if (!text) return;
    const { x, y } = getCenter();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const rotation = (Math.random() * 10 - 5).toFixed(1);
    try { await createBoardItem(token, groupId, { item_type: "note", content: text, color, pos_x: x - 70, pos_y: y - 70, rotation: parseFloat(rotation) }); await onRefresh(); } catch { /* silent */ }
  };

  const addPhoto = async () => {
    const url = window.prompt("URL фото або Google Drive посилання:");
    if (!url) return;
    const { x, y } = getCenter();
    const rotation = (Math.random() * 6 - 3).toFixed(1);
    try { await createBoardItem(token, groupId, { item_type: "photo", content: url, pos_x: x - 80, pos_y: y - 80, rotation: parseFloat(rotation) }); await onRefresh(); } catch { /* silent */ }
  };

  const addPin = async () => {
    const { x, y } = getCenter();
    try { await createBoardItem(token, groupId, { item_type: "pin", pos_x: x - 15, pos_y: y - 15 }); await onRefresh(); } catch { /* silent */ }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Видалити всі елементи з дошки?")) return;
    try { await clearBoard(token, groupId); await onRefresh(); } catch { /* silent */ }
  };

  const handleDeleteItem = async (id) => {
    try { await deleteBoardItem(token, groupId, id); await onRefresh(); } catch { /* silent */ }
  };

  // ── Canvas class ──────────────────────────────────────────────────────────
  const canvasClass = ["board-canvas", activeTool === "panning" ? "panning" : "", activeTool === "draw" ? "drawing" : "", activeTool === "select" ? "selecting" : "", activeTool === "erase" ? "erasing" : ""].filter(Boolean).join(" ");

  // ── Render items ──────────────────────────────────────────────────────────
  const renderItem = (item) => {
    if (item.item_type === "draw") {
      // SVG paths are rendered inside the SVG layer directly
      return null;
    }

    const isErasing = activeTool === "erase";
    const commonProps = {
      onPointerDown: (e) => handleItemPointerDown(e, item),
      onPointerMove: (e) => handleItemPointerMove(e, item.id),
      onPointerUp: (e) => handleItemPointerUp(e, item),
      onClick: isErasing ? (e) => { e.stopPropagation(); handleDeleteItem(item.id); } : undefined,
    };

    const canDelete = isAdmin || item.author_id === currentUser?.id;

    if (item.item_type === "note") {
      return (
        <div
          key={item.id}
          className={`sticky-note ${item.color || "yellow"}`}
          style={{ left: item.pos_x, top: item.pos_y, transform: `rotate(${item.rotation || 0}deg)`, zIndex: item.z_index, touchAction: "none" }}
          {...commonProps}
        >
          {item.content}
          <div className="note-avatar">
            {item.author_avatar ? <img src={item.author_avatar} alt="" /> : (item.author_name?.[0] || "?")}
          </div>
          {canDelete && !isErasing && (
            <button
              className="note-delete-btn"
              style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--card-bg)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}
            >✕</button>
          )}
        </div>
      );
    }

    if (item.item_type === "photo") {
      const src = item.content?.includes("drive.google.com")
        ? item.content.replace(/\/file\/d\/(.+?)\/.*/, "/uc?export=view&id=$1")
        : item.content;
      return (
        <div
          key={item.id}
          className="sticky-note photo-type"
          style={{ left: item.pos_x, top: item.pos_y, transform: `rotate(${item.rotation || 0}deg)`, zIndex: item.z_index, touchAction: "none" }}
          {...commonProps}
        >
          <img src={src} alt="board" onError={e => { e.target.style.display = "none"; }} />
          <div className="note-avatar">
            {item.author_avatar ? <img src={item.author_avatar} alt="" /> : (item.author_name?.[0] || "?")}
          </div>
          {canDelete && !isErasing && (
            <button
              style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--card-bg)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}
            >✕</button>
          )}
        </div>
      );
    }

    if (item.item_type === "pin") {
      return (
        <div
          key={item.id}
          className="board-pin"
          style={{ left: item.pos_x, top: item.pos_y, zIndex: item.z_index, touchAction: "none" }}
          {...commonProps}
        >
          <div className="pin-head" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="board-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="ph ph-notepad"></i> Інфо Дошка
        </h3>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isAdmin && (
            <>
              <button
                className={`icon-btn${activeTool === "select" ? " tool-active" : ""}`}
                title="Виділити та видалити"
                onClick={() => setTool("select")}
                style={{ fontSize: 15 }}
              >✂️</button>
              <button className="icon-btn" style={{ color: "var(--danger)", fontSize: 15 }} title="Очистити дошку" onClick={handleClearAll}>🗑</button>
            </>
          )}
        </div>
      </div>

      <div
        className="info-board-container"
        ref={containerRef}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
      >
        {/* Blur overlay */}
        <div className={`board-blur-overlay ${blurActive ? "" : "hidden"}`}>
          <i className="ph ph-eye-slash" style={{ fontSize: 48, marginBottom: 15, color: "var(--text-main)" }}></i>
          <h3>Вміст приховано</h3>
          <button className="btn-main" style={{ width: "auto", padding: "12px 28px", borderRadius: 50 }} onClick={() => setBlurActive(false)}>
            Відобразити вміст
          </button>
        </div>

        {/* Selection box */}
        <div className="board-selection-box" ref={selBoxRef} />

        {/* Canvas */}
        <div className={canvasClass} ref={canvasRef}>
          {/* SVG draw layer */}
          <svg
            ref={svgRef}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: activeTool === "erase" ? "auto" : "none", zIndex: 0 }}
          >
            {items.filter(i => i.item_type === "draw").map(item => (
              <path
                key={item.id}
                className="board-draw-path"
                d={item.content || ""}
                onClick={activeTool === "erase" ? (e) => { e.stopPropagation(); handleDeleteItem(item.id); } : undefined}
                style={{ cursor: activeTool === "erase" ? "cell" : "pointer", pointerEvents: "auto" }}
              />
            ))}
          </svg>

          {/* Notes, photos, pins */}
          {items.map(renderItem)}
        </div>

        {/* Floating toolbar inside canvas */}
        <div className="board-main-toolbar">
          <button className={`board-tool-btn${activeTool === "draw" ? " active" : ""}`} onClick={() => setTool("draw")}>
            <i className="ph ph-pencil-simple"></i><span>Draw</span>
          </button>
          <button className={`board-tool-btn${activeTool === "erase" ? " erase-active" : ""}`} onClick={() => setTool("erase")}>
            <i className="ph ph-eraser"></i><span>Erase</span>
          </button>
          <button className="board-tool-btn" onClick={addNote}>
            <i className="ph ph-text-t"></i><span>Text</span>
          </button>
          <button className="board-tool-btn" onClick={addPhoto}>
            <i className="ph ph-image"></i><span>Photo</span>
          </button>
          <button className="board-tool-btn" onClick={addPin}>
            <i className="ph ph-push-pin"></i><span>Pin</span>
          </button>
          <button className="board-tool-btn" onClick={() => zoom(1.2)}>
            <i className="ph ph-magnifying-glass-plus"></i><span>+</span>
          </button>
          <button className="board-tool-btn" onClick={() => zoom(0.8)}>
            <i className="ph ph-magnifying-glass-minus"></i><span>−</span>
          </button>
          <button className="board-tool-btn" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 }; applyTransform(); }}>
            <i className="ph ph-arrows-in"></i><span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root Board Component ────────────────────────────────────────────────────

const Board = () => {
  const { groupId } = useParams();
  const { token, user } = useAuth();

  const [boardItems, setBoardItems] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadAll = useCallback(async () => {
    if (!token || !groupId) return;
    try {
      const [boardRes, dlRes] = await Promise.all([
        fetchBoard(token, groupId),
        fetchDeadlines(token, groupId),
      ]);
      setBoardItems(boardRes.data.items);
      setIsAdmin(boardRes.data.is_admin);
      setDeadlines(dlRes.data.items);
    } catch { /* silent */ }
  }, [token, groupId]);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 5000);
    return () => clearInterval(id);
  }, [loadAll]);

  return (
    <div className="home-wrapper">
      <InfoBoard
        items={boardItems}
        isAdmin={isAdmin}
        token={token}
        groupId={groupId}
        currentUser={user}
        onRefresh={loadAll}
      />
      <DeadlinesPanel
        deadlines={deadlines}
        isAdmin={isAdmin}
        token={token}
        groupId={groupId}
        onRefresh={loadAll}
      />
    </div>
  );
};

export default Board;
