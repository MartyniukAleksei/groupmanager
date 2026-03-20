import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchHomework, saveHomework } from "../../api/homework";
import Spinner from "../../components/ui/Spinner";
import PageHint from "../../components/ui/PageHint";
import "../../styles/homework.css";

const DAYS = [
  { id: "monday", label: "ПОНЕДІЛОК", short: "ПОН" },
  { id: "tuesday", label: "ВІВТОРОК", short: "ВІВ" },
  { id: "wednesday", label: "СЕРЕДА", short: "СЕР" },
  { id: "thursday", label: "ЧЕТВЕР", short: "ЧЕТ" },
  { id: "friday", label: "П'ЯТНИЦЯ", short: "ПТ" },
  { id: "saturday", label: "СУБОТА", short: "СУБ" },
];

const getWeekStart = (offset) => {
  const today = new Date();
  const dow = today.getDay();
  const mondayDiff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDiff + offset * 7);
  return monday.toISOString().split("T")[0];
};

const getWeekLabel = (offset) => {
  const weekStart = getWeekStart(offset);
  const monday = new Date(weekStart);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) =>
    `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  return `Тиждень ${fmt(monday)} - ${fmt(sunday)}`;
};

const Homework = () => {
  const { groupId } = useParams();
  const { token } = useAuth();

  const [currentDay, setCurrentDay] = useState(() => {
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const today = dayMap[new Date().getDay()];
    return today === "sunday" ? "monday" : today;
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPendingChanges({});
      setIsEditMode(false);
      try {
        const weekStart = getWeekStart(weekOffset);
        const { data } = await fetchHomework(token, groupId, weekStart);
        setWeekData(data);
      } catch (e) {
        setWeekData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, groupId, weekOffset]);

  const handleChange = (day, subjectName, text) => {
    setPendingChanges((prev) => ({ ...prev, [`${day}|${subjectName}`]: text }));
  };

  const handleDone = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setIsEditMode(false);
      return;
    }
    setSaving(true);
    try {
      const weekStart = getWeekStart(weekOffset);
      await Promise.all(
        Object.entries(pendingChanges).map(([key, text]) => {
          const [day, subjectName] = key.split("|");
          const entry = weekData.entries.find(
            (e) => e.day === day && e.subject_name === subjectName,
          );
          return saveHomework(token, groupId, {
            week_start: weekStart,
            day,
            subject_name: subjectName,
            schedule_entry_id: entry?.schedule_entry_id ?? null,
            text,
          });
        }),
      );
      const { data } = await fetchHomework(token, groupId, weekStart);
      setWeekData(data);
      setPendingChanges({});
      setIsEditMode(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const activeSubjects =
    weekData?.entries.filter((e) => e.day === currentDay) ?? [];
  const activeDayObj = DAYS.find((d) => d.id === currentDay);
  const isNotCurrentWeek = weekOffset !== 0;

  return (
    <div className="hw-wrapper">
      <PageHint page="homework" />
      {/* ВЕРХНЯ ПАНЕЛЬ ДІЙ */}
      <div className="hw-header-actions">
        {weekData?.is_admin && (
          <button
            className={`hw-edit-btn ${isEditMode ? "active" : ""}`}
            onClick={isEditMode ? handleDone : () => setIsEditMode(true)}
            disabled={saving}
          >
            ✏️{" "}
            <span className="btn-text" style={{ marginLeft: "6px" }}>
              {saving ? "Збереження..." : isEditMode ? "Готово" : "Редагувати"}
            </span>
          </button>
        )}
      </div>

      {/* НАВІГАЦІЯ ПО ТИЖНЯХ */}
      <div className="hw-week-nav-container">
        <div className="hw-week-nav-row">
          <button
            className="hw-nav-arrow"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            {"<"}
          </button>
          <div className="hw-week-title">{getWeekLabel(weekOffset)}</div>
          <button
            className="hw-nav-arrow"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            {">"}
          </button>
        </div>

        <div
          style={{
            height: isNotCurrentWeek ? "28px" : "0",
            marginTop: isNotCurrentWeek ? "5px" : "0",
            overflow: "hidden",
          }}
        >
          {isNotCurrentWeek && (
            <button className="hw-return-btn" onClick={() => setWeekOffset(0)}>
              Поверн. на пот. тиждень
            </button>
          )}
        </div>
      </div>

      {/* ПАНЕЛЬ ВИБОРУ ДНЯ */}
      <div className="hw-day-picker">
        {DAYS.map((day) => (
          <button
            key={day.id}
            className={`hw-day-btn ${currentDay === day.id ? "active" : ""}`}
            onClick={() => setCurrentDay(day.id)}
          >
            <span className="hw-day-full">{day.label}</span>
            <span className="hw-day-short">{day.short}</span>
          </button>
        ))}
      </div>

      {/* КАРТКА З ПРЕДМЕТАМИ */}
      <div className="hw-day-card">
        <h3 className="hw-day-title">{activeDayObj?.label}</h3>

        {loading ? (
          <Spinner size={32} />
        ) : activeSubjects.length === 0 ? (
          <div
            style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}
          >
            На цей день пар немає 🎉
          </div>
        ) : (
          <div className="hw-subjects-list">
            {activeSubjects.map((subject, idx) => {
              const key = `${subject.day}|${subject.subject_name}`;
              const value =
                key in pendingChanges ? pendingChanges[key] : subject.text;
              return (
                <div key={idx} className="hw-subject-item">
                  <div className="hw-subject-name">{subject.subject_name}</div>
                  <textarea
                    className="hw-textarea"
                    placeholder={
                      isEditMode ? "Введіть завдання..." : "Завдань немає"
                    }
                    value={value}
                    onChange={(e) =>
                      handleChange(
                        subject.day,
                        subject.subject_name,
                        e.target.value,
                      )
                    }
                    rows={isEditMode ? 3 : 1}
                    readOnly={!isEditMode}
                    style={{
                      height: !isEditMode && !value ? "auto" : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Homework;
